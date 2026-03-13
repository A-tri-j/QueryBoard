from __future__ import annotations

import re

import pandas as pd

from models import ChartSpec
from schema_extractor import df


MAX_SCATTER_POINTS = 1500
CATEGORY_ORDERS = {
    "age_group": ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
    "gender": ["Male", "Female", "Other"],
    "city_tier": ["Tier 1", "Tier 2", "Tier 3"],
    "shopping_preference": ["Online", "Store", "Hybrid"],
}
FIXED_SCORE_BINS = [0.5, 2.5, 4.5, 6.5, 8.5, 10.5]
FIXED_SCORE_LABELS = ["1-2", "3-4", "5-6", "7-8", "9-10"]


def _normalize_text(text: str) -> str:
    normalized = text.lower().replace("_", " ")
    normalized = re.sub(r"[^a-z0-9\s]+", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def _humanize(column: str) -> str:
    return column.replace("_", " ").title()


def _contains_all(query: str, keywords: list[str]) -> bool:
    return all(keyword in query for keyword in keywords)


def _sort_frame(frame: pd.DataFrame, column: str, order: list[str] | None = None) -> pd.DataFrame:
    sorted_frame = frame.copy()

    if order:
        sorted_frame[column] = pd.Categorical(sorted_frame[column], categories=order, ordered=True)
        sorted_frame = sorted_frame.sort_values(column)
    elif pd.api.types.is_numeric_dtype(sorted_frame[column]):
        sorted_frame = sorted_frame.sort_values(column)
    else:
        sorted_frame = sorted_frame.sort_values(column, key=lambda series: series.astype(str))

    return sorted_frame.reset_index(drop=True)


def _records_from_frame(frame: pd.DataFrame, category_columns: list[str]) -> list[dict]:
    records = frame.to_dict(orient="records")

    for record in records:
        for column in category_columns:
            if column in record:
                record[column] = str(record[column])

        for key, value in list(record.items()):
            if isinstance(value, float):
                record[key] = round(value, 2)

    return records


def _build_chart(
    chart_type: str,
    title: str,
    x: str,
    y: str,
    data: list[dict],
    reason: str,
) -> ChartSpec:
    return ChartSpec(
        type=chart_type,
        title=title,
        x=x,
        y=y,
        data=data,
        reason=reason,
    )


def _build_grouped_mean_chart(
    group_column: str,
    metrics: list[str],
    title: str,
    chart_type: str = "bar",
    reason: str | None = None,
    order: list[str] | None = None,
) -> ChartSpec:
    working = df[[group_column, *metrics]].dropna()
    result = working.groupby(group_column, observed=False)[metrics].mean().reset_index()
    result = _sort_frame(result, group_column, order or CATEGORY_ORDERS.get(group_column))
    records = _records_from_frame(result, [group_column])

    return _build_chart(
        chart_type=chart_type,
        title=title,
        x=group_column,
        y=", ".join(metrics),
        data=records,
        reason=reason or f"Aggregated average {', '.join(_humanize(metric) for metric in metrics)} by {_humanize(group_column)}.",
    )


def _build_grouped_sum_chart(
    group_column: str,
    metric: str,
    title: str,
    order: list[str] | None = None,
) -> ChartSpec:
    working = df[[group_column, metric]].dropna()
    result = working.groupby(group_column, observed=False)[metric].sum().reset_index()
    result = _sort_frame(result, group_column, order or CATEGORY_ORDERS.get(group_column))
    records = _records_from_frame(result, [group_column])

    return _build_chart(
        chart_type="bar",
        title=title,
        x=group_column,
        y=metric,
        data=records,
        reason=f"Summed {_humanize(metric)} within each {_humanize(group_column)} bucket to compare total contribution.",
    )


def _build_scatter_chart(
    x_column: str,
    y_column: str,
    title: str,
    reason: str | None = None,
) -> ChartSpec:
    working = df[[x_column, y_column]].dropna()
    full_point_count = len(working)

    if full_point_count > MAX_SCATTER_POINTS:
        working = working.sample(n=MAX_SCATTER_POINTS, random_state=42)

    records = _records_from_frame(working.reset_index(drop=True), [])
    sample_suffix = (
        f" using a representative sample of {len(records):,} customers"
        if len(records) < full_point_count
        else ""
    )

    return _build_chart(
        chart_type="scatter",
        title=title,
        x=x_column,
        y=y_column,
        data=records,
        reason=reason or f"Scatter plot shows the row-level relationship between {_humanize(x_column)} and {_humanize(y_column)}{sample_suffix}.",
    )


def _format_interval(interval: pd.Interval) -> str:
    return f"{interval.left:.1f}-{interval.right:.1f}"


def _build_histogram_chart(column: str, title: str, bins: int = 10) -> ChartSpec:
    series = pd.to_numeric(df[column], errors="coerce").dropna()

    if series.nunique() <= 12 and (series % 1 == 0).all():
        counts = series.value_counts().sort_index()
        data = [
            {column: int(value), "count": int(count)}
            for value, count in counts.items()
        ]
    else:
        bucket_count = min(bins, max(4, int(series.nunique() ** 0.5)))
        categories = pd.cut(series, bins=bucket_count, include_lowest=True, duplicates="drop")
        counts = categories.value_counts(sort=False)
        data = [
            {column: _format_interval(interval), "count": int(count)}
            for interval, count in counts.items()
        ]

    return _build_chart(
        chart_type="histogram",
        title=title,
        x=column,
        y="count",
        data=data,
        reason=f"Histogram shows how {_humanize(column)} is distributed across the dataset.",
    )


def _build_quantile_group_chart(
    source_column: str,
    value_column: str,
    title: str,
    aggregation: str = "sum",
    group_name: str | None = None,
) -> ChartSpec:
    working = df[[source_column, value_column]].dropna().copy()
    working[group_name or f"{source_column}_group"] = pd.qcut(
        working[source_column],
        q=5,
        duplicates="drop",
    )
    bucket_column = group_name or f"{source_column}_group"
    result = working.groupby(bucket_column, observed=False)[value_column].agg(aggregation).reset_index()
    result[bucket_column] = result[bucket_column].map(_format_interval)
    records = _records_from_frame(result, [bucket_column])
    aggregation_label = "Summed" if aggregation == "sum" else "Averaged"

    return _build_chart(
        chart_type="bar",
        title=title,
        x=bucket_column,
        y=value_column,
        data=records,
        reason=f"{aggregation_label} {_humanize(value_column)} across quantile-based {_humanize(source_column)} groups.",
    )


def _build_fixed_score_group_chart(
    source_column: str,
    value_column: str,
    title: str,
    aggregation: str = "mean",
    group_name: str | None = None,
) -> ChartSpec:
    working = df[[source_column, value_column]].dropna().copy()
    bucket_column = group_name or f"{source_column}_group"
    working[bucket_column] = pd.cut(
        working[source_column],
        bins=FIXED_SCORE_BINS,
        labels=FIXED_SCORE_LABELS,
        include_lowest=True,
    )
    result = working.groupby(bucket_column, observed=False)[value_column].agg(aggregation).reset_index()
    result = _sort_frame(result, bucket_column, FIXED_SCORE_LABELS)
    records = _records_from_frame(result, [bucket_column])
    aggregation_label = "Summed" if aggregation == "sum" else "Averaged"

    return _build_chart(
        chart_type="bar",
        title=title,
        x=bucket_column,
        y=value_column,
        data=records,
        reason=f"{aggregation_label} {_humanize(value_column)} across {_humanize(source_column)} score bands.",
    )


def _build_preference_mix_chart(score_column: str, title: str) -> ChartSpec:
    working = df[[score_column, "shopping_preference"]].dropna()
    result = (
        working
        .groupby([score_column, "shopping_preference"], observed=False)
        .size()
        .unstack(fill_value=0)
        .reset_index()
    )
    ordered_columns = [score_column, *[value for value in CATEGORY_ORDERS["shopping_preference"] if value in result.columns]]
    remaining_columns = [column for column in result.columns if column not in ordered_columns]
    result = result[ordered_columns + remaining_columns]
    result = _sort_frame(result, score_column)
    records = _records_from_frame(result, [])

    return _build_chart(
        chart_type="bar",
        title=title,
        x=score_column,
        y="shopping_preference_count",
        data=records,
        reason=f"Grouped bars show how shopping preference counts shift across {_humanize(score_column)} levels.",
    )


def _age_dashboard() -> tuple[list[ChartSpec], str]:
    charts = [
        _build_grouped_mean_chart(
            group_column="age_group",
            metrics=["monthly_online_orders"],
            title="Average Monthly Online Orders by Age Group",
            reason="Shows how online order frequency changes across age groups.",
            order=CATEGORY_ORDERS["age_group"],
        ),
        _build_grouped_mean_chart(
            group_column="age_group",
            metrics=["monthly_store_visits"],
            title="Average Monthly Store Visits by Age Group",
            reason="Shows how store visit frequency changes across age groups.",
            order=CATEGORY_ORDERS["age_group"],
        ),
        _build_grouped_mean_chart(
            group_column="age_group",
            metrics=["avg_online_spend", "avg_store_spend"],
            title="Average Online and Store Spend by Age Group",
            reason="Places online and store spending side by side for each age group.",
            order=CATEGORY_ORDERS["age_group"],
        ),
    ]

    return charts, "Built an online vs store behavior dashboard across age groups."


def _internet_usage_dashboard() -> tuple[list[ChartSpec], str]:
    charts = [
        _build_scatter_chart(
            "daily_internet_hours",
            "monthly_online_orders",
            "Daily Internet Hours vs Monthly Online Orders",
        ),
        _build_scatter_chart(
            "daily_internet_hours",
            "avg_online_spend",
            "Daily Internet Hours vs Average Online Spend",
        ),
        _build_histogram_chart(
            "daily_internet_hours",
            "Distribution of Daily Internet Hours",
        ),
    ]

    return charts, "Built an internet usage dashboard for online shopping behavior."


def _income_dashboard() -> tuple[list[ChartSpec], str]:
    total_spending = (df["avg_online_spend"] + df["avg_store_spend"]).rename("total_spending")
    working = df.assign(total_spending=total_spending)

    charts = [
        _build_scatter_chart(
            "monthly_income",
            "avg_online_spend",
            "Monthly Income vs Average Online Spend",
        ),
        _build_scatter_chart(
            "monthly_income",
            "avg_store_spend",
            "Monthly Income vs Average Store Spend",
        ),
    ]

    grouped = working[["monthly_income", "total_spending"]].dropna().copy()
    grouped["monthly_income_group"] = pd.qcut(grouped["monthly_income"], q=5, duplicates="drop")
    income_chart_df = grouped.groupby("monthly_income_group", observed=False)["total_spending"].sum().reset_index()
    income_chart_df["monthly_income_group"] = income_chart_df["monthly_income_group"].map(_format_interval)
    charts.append(
        _build_chart(
            chart_type="bar",
            title="Total Spending by Monthly Income Group",
            x="monthly_income_group",
            y="total_spending",
            data=_records_from_frame(income_chart_df, ["monthly_income_group"]),
            reason="Summed combined online and store spending across income groups.",
        )
    )

    return charts, "Built an income vs spending dashboard for online and store behavior."


def _tech_savvy_dashboard() -> tuple[list[ChartSpec], str]:
    charts = [
        _build_scatter_chart(
            "tech_savvy_score",
            "monthly_online_orders",
            "Tech Savvy Score vs Monthly Online Orders",
        ),
        _build_scatter_chart(
            "tech_savvy_score",
            "avg_online_spend",
            "Tech Savvy Score vs Average Online Spend",
        ),
        _build_histogram_chart(
            "tech_savvy_score",
            "Distribution of Tech Savvy Score",
        ),
    ]

    return charts, "Built a tech savviness dashboard for online purchasing behavior."


def _gender_dashboard() -> tuple[list[ChartSpec], str]:
    charts = [
        _build_grouped_mean_chart(
            group_column="gender",
            metrics=["avg_online_spend"],
            title="Average Online Spend by Gender",
            order=CATEGORY_ORDERS["gender"],
        ),
        _build_grouped_mean_chart(
            group_column="gender",
            metrics=["avg_store_spend"],
            title="Average Store Spend by Gender",
            order=CATEGORY_ORDERS["gender"],
        ),
        _build_grouped_mean_chart(
            group_column="gender",
            metrics=["monthly_online_orders"],
            title="Average Monthly Online Orders by Gender",
            order=CATEGORY_ORDERS["gender"],
        ),
    ]

    return charts, "Built a gender comparison dashboard for shopping behavior."


def _city_tier_dashboard() -> tuple[list[ChartSpec], str]:
    charts = [
        _build_grouped_mean_chart(
            group_column="city_tier",
            metrics=["avg_online_spend"],
            title="Average Online Spend by City Tier",
            order=CATEGORY_ORDERS["city_tier"],
        ),
        _build_grouped_mean_chart(
            group_column="city_tier",
            metrics=["avg_store_spend"],
            title="Average Store Spend by City Tier",
            order=CATEGORY_ORDERS["city_tier"],
        ),
        _build_grouped_mean_chart(
            group_column="city_tier",
            metrics=["monthly_online_orders"],
            title="Average Monthly Online Orders by City Tier",
            order=CATEGORY_ORDERS["city_tier"],
        ),
    ]

    return charts, "Built a city-tier dashboard for shopping behavior."


def _delivery_dashboard() -> tuple[list[ChartSpec], str]:
    charts = [
        _build_scatter_chart(
            "avg_delivery_days",
            "monthly_online_orders",
            "Average Delivery Days vs Monthly Online Orders",
        ),
        _build_scatter_chart(
            "delivery_fee_sensitivity",
            "avg_online_spend",
            "Delivery Fee Sensitivity vs Average Online Spend",
        ),
        _build_histogram_chart(
            "avg_delivery_days",
            "Distribution of Average Delivery Days",
        ),
    ]

    return charts, "Built a delivery experience dashboard for online shopping behavior."


def _discount_dashboard() -> tuple[list[ChartSpec], str]:
    purchase_activity = (df["monthly_online_orders"] + df["monthly_store_visits"]).rename("total_purchase_activity")
    working = df.assign(total_purchase_activity=purchase_activity)

    charts = [
        _build_scatter_chart(
            "discount_sensitivity",
            "monthly_online_orders",
            "Discount Sensitivity vs Monthly Online Orders",
        ),
        _build_scatter_chart(
            "discount_sensitivity",
            "avg_online_spend",
            "Discount Sensitivity vs Average Online Spend",
        ),
    ]

    score_chart_df = working[["discount_sensitivity", "total_purchase_activity"]].dropna().copy()
    score_chart_df["discount_sensitivity_group"] = pd.cut(
        score_chart_df["discount_sensitivity"],
        bins=FIXED_SCORE_BINS,
        labels=FIXED_SCORE_LABELS,
        include_lowest=True,
    )
    score_chart_df = (
        score_chart_df
        .groupby("discount_sensitivity_group", observed=False)["total_purchase_activity"]
        .mean()
        .reset_index()
    )
    score_chart_df = _sort_frame(score_chart_df, "discount_sensitivity_group", FIXED_SCORE_LABELS)
    charts.append(
        _build_chart(
            chart_type="bar",
            title="Average Purchase Activity by Discount Sensitivity Group",
            x="discount_sensitivity_group",
            y="total_purchase_activity",
            data=_records_from_frame(score_chart_df, ["discount_sensitivity_group"]),
            reason="Shows whether higher discount sensitivity aligns with more combined purchase activity.",
        )
    )

    return charts, "Built a discount sensitivity dashboard for purchase behavior."


def _impulse_dashboard() -> tuple[list[ChartSpec], str]:
    charts = [
        _build_grouped_mean_chart(
            group_column="age_group",
            metrics=["impulse_buying_score"],
            title="Average Impulse Buying Score by Age Group",
            order=CATEGORY_ORDERS["age_group"],
        ),
        _build_grouped_mean_chart(
            group_column="gender",
            metrics=["impulse_buying_score"],
            title="Average Impulse Buying Score by Gender",
            order=CATEGORY_ORDERS["gender"],
        ),
        _build_scatter_chart(
            "impulse_buying_score",
            "avg_online_spend",
            "Impulse Buying Score vs Average Online Spend",
        ),
    ]

    return charts, "Built an impulse buying dashboard across age, gender, and online spend."


def _brand_loyalty_dashboard() -> tuple[list[ChartSpec], str]:
    charts = [
        _build_scatter_chart(
            "brand_loyalty_score",
            "avg_online_spend",
            "Brand Loyalty Score vs Average Online Spend",
        ),
        _build_scatter_chart(
            "brand_loyalty_score",
            "monthly_online_orders",
            "Brand Loyalty Score vs Monthly Online Orders",
        ),
        _build_histogram_chart(
            "brand_loyalty_score",
            "Distribution of Brand Loyalty Score",
        ),
    ]

    return charts, "Built a brand loyalty dashboard for purchasing patterns."


def _environment_dashboard() -> tuple[list[ChartSpec], str]:
    charts = [
        _build_preference_mix_chart(
            "environmental_awareness",
            "Shopping Preference Mix by Environmental Awareness",
        ),
        _build_grouped_mean_chart(
            group_column="environmental_awareness",
            metrics=["avg_online_spend"],
            title="Average Online Spend by Environmental Awareness",
            chart_type="bar",
        ),
        _build_histogram_chart(
            "environmental_awareness",
            "Distribution of Environmental Awareness",
        ),
    ]

    return charts, "Built an environmental awareness dashboard for shopping preference and spend."


def _social_media_dashboard() -> tuple[list[ChartSpec], str]:
    charts = [
        _build_scatter_chart(
            "social_media_hours",
            "monthly_online_orders",
            "Social Media Hours vs Monthly Online Orders",
        ),
        _build_scatter_chart(
            "social_media_hours",
            "avg_online_spend",
            "Social Media Hours vs Average Online Spend",
        ),
        _build_histogram_chart(
            "social_media_hours",
            "Distribution of Social Media Hours",
        ),
    ]

    return charts, "Built a social media usage dashboard for online shopping behavior."


def _payment_trust_dashboard() -> tuple[list[ChartSpec], str]:
    charts = [
        _build_scatter_chart(
            "online_payment_trust_score",
            "monthly_online_orders",
            "Online Payment Trust Score vs Monthly Online Orders",
        ),
        _build_scatter_chart(
            "online_payment_trust_score",
            "avg_online_spend",
            "Online Payment Trust Score vs Average Online Spend",
        ),
        _build_histogram_chart(
            "online_payment_trust_score",
            "Distribution of Online Payment Trust Score",
        ),
    ]

    return charts, "Built an online payment trust dashboard for purchasing behavior."


def _store_experience_dashboard() -> tuple[list[ChartSpec], str]:
    charts = [
        _build_scatter_chart(
            "need_touch_feel_score",
            "monthly_store_visits",
            "Need to Touch and Feel Score vs Monthly Store Visits",
        ),
        _build_scatter_chart(
            "need_touch_feel_score",
            "avg_store_spend",
            "Need to Touch and Feel Score vs Average Store Spend",
        ),
        _build_histogram_chart(
            "need_touch_feel_score",
            "Distribution of Need to Touch and Feel Score",
        ),
    ]

    return charts, "Built a store experience dashboard for visits and spending."


def _overall_dashboard() -> tuple[list[ChartSpec], str]:
    charts = [
        _build_grouped_mean_chart(
            group_column="age_group",
            metrics=["monthly_online_orders"],
            title="Average Monthly Online Orders by Age Group",
            order=CATEGORY_ORDERS["age_group"],
        ),
        _build_grouped_mean_chart(
            group_column="gender",
            metrics=["avg_online_spend", "avg_store_spend"],
            title="Average Online and Store Spend by Gender",
            order=CATEGORY_ORDERS["gender"],
        ),
        _build_scatter_chart(
            "tech_savvy_score",
            "monthly_online_orders",
            "Tech Savvy Score vs Monthly Online Orders",
        ),
        _build_grouped_mean_chart(
            group_column="city_tier",
            metrics=["avg_online_spend", "avg_store_spend"],
            title="Average Online and Store Spend by City Tier",
            order=CATEGORY_ORDERS["city_tier"],
        ),
    ]

    return charts, "Built an overall customer behavior dashboard across demographics and technology usage."


def _match_dashboard(query: str) -> tuple[list[ChartSpec], str] | None:
    if _contains_all(query, ["online", "store", "age group"]) and "behavior" in query:
        return _age_dashboard()

    if ("daily internet" in query or "internet usage" in query) and "online shopping behavior" in query:
        return _internet_usage_dashboard()

    if "monthly income" in query and "spending" in query:
        return _income_dashboard()

    if ("tech savvy" in query or "tech savviness" in query) and (
        "online purchasing behavior" in query or "online shopping behavior" in query
    ):
        return _tech_savvy_dashboard()

    if ("male and female" in query or "gender" in query) and "shopping behavior" in query:
        return _gender_dashboard()

    if "city tier" in query and "shopping behavior" in query:
        return _city_tier_dashboard()

    if "delivery experience" in query and "online shopping behavior" in query:
        return _delivery_dashboard()

    if "discount sensitivity" in query and "purchase behavior" in query:
        return _discount_dashboard()

    if "impulse buying behavior" in query and "age groups" in query and "gender" in query:
        return _impulse_dashboard()

    if "brand loyalty" in query and "purchasing patterns" in query:
        return _brand_loyalty_dashboard()

    if "environmental awareness" in query and "shopping preference" in query:
        return _environment_dashboard()

    if "social media" in query and "online shopping behavior" in query:
        return _social_media_dashboard()

    if "payment trust" in query and "online purchasing behavior" in query:
        return _payment_trust_dashboard()

    if ("touch and feel" in query or "need to touch" in query) and "store" in query:
        return _store_experience_dashboard()

    if (
        "overall customer behavior" in query
        or ("overview" in query and "customer shopping behavior" in query)
        or ("demographics" in query and "technology usage" in query)
    ):
        return _overall_dashboard()

    return None


def build_dashboard_response(query: str) -> tuple[list[ChartSpec], int, str] | None:
    normalized_query = _normalize_text(query)
    matched_dashboard = _match_dashboard(normalized_query)
    if not matched_dashboard:
        return None

    charts, summary = matched_dashboard
    return charts, len(df), summary
