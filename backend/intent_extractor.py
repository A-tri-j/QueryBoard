import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI, OpenAIError

from models import FilterModel, IntentModel
from schema_extractor import schema_memory

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

NUMERIC_COLUMNS = [
    col["name"]
    for col in schema_memory["columns"]
    if col["type"] == "numeric"
]
CATEGORICAL_COLUMNS = [
    col["name"]
    for col in schema_memory["columns"]
    if col["type"] == "categorical"
]
ALL_COLUMNS = NUMERIC_COLUMNS + CATEGORICAL_COLUMNS


def _build_system_prompt() -> str:
    numeric_cols = [
        f"  - {col['name']} (numeric, range: {col['min']} to {col['max']})"
        for col in schema_memory["columns"]
        if col["type"] == "numeric"
    ]

    categorical_cols = [
        f"  - {col['name']} (categorical, values: {', '.join(str(v) for v in col['values'])})"
        for col in schema_memory["columns"]
        if col["type"] == "categorical"
    ]

    return f"""
You are a data analyst assistant. Your job is to convert a natural language question
into a structured JSON object that describes what data to retrieve and how to visualize it.

DATASET SCHEMA:
The dataset has {schema_memory['row_count']} rows.

Numeric columns (these can be aggregated with sum, mean, count, min, max):
{chr(10).join(numeric_cols)}

Categorical columns (these can be used for grouping and filtering):
{chr(10).join(categorical_cols)}

YOUR TASK:
Return a single valid JSON object with exactly these fields:

{{
  "metric": "<a numeric column name to aggregate>",
  "aggregation": "<one of: sum, mean, count, min, max>",
  "group_by": ["<categorical or numeric column name>"],
  "filters": [
    {{
      "column": "<column name>",
      "operator": "<one of: ==, !=, >, <, >=, <=",
      "value": "<value>"
    }}
  ],
  "chart_preference": "<one of: auto, bar, line, scatter, pie>"
}}

STRICT RULES:
1. metric MUST be a numeric column from the schema above.
2. group_by MUST only contain column names that exist in the schema.
3. filters is optional - use empty array [] if no filtering is needed.
4. filter values for categorical columns MUST exactly match the values listed above.
5. chart_preference should be "auto" unless the user explicitly asks for a chart type.
6. Return ONLY the JSON object. No explanation, no markdown, no code blocks.
7. Do not invent column names. Only use columns listed in the schema above.

EXAMPLES:

User: "Show average online spend by city tier"
Output:
{{
  "metric": "avg_online_spend",
  "aggregation": "mean",
  "group_by": ["city_tier"],
  "filters": [],
  "chart_preference": "auto"
}}

User: "Compare total store spend between male and female customers"
Output:
{{
  "metric": "avg_store_spend",
  "aggregation": "sum",
  "group_by": ["gender"],
  "filters": [],
  "chart_preference": "auto"
}}

User: "Show a pie chart of average brand loyalty score by shopping preference"
Output:
{{
  "metric": "brand_loyalty_score",
  "aggregation": "mean",
  "group_by": ["shopping_preference"],
  "filters": [],
  "chart_preference": "pie"
}}
"""


SYSTEM_PROMPT = _build_system_prompt()


def _normalize_text(text: str) -> str:
    normalized = text.lower().replace("_", " ")
    normalized = re.sub(r"[^a-z0-9\s]+", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def _default_aliases(column: str) -> set[str]:
    words = column.split("_")
    aliases = {" ".join(words)}

    if words[0] in {"avg", "monthly", "daily"} and len(words) > 1:
        aliases.add(" ".join(words[1:]))

    if words[-1] == "score" and len(words) > 1:
        aliases.add(" ".join(words[:-1]))

    if words[-1] in {"hours", "years", "days"} and len(words) > 1:
        aliases.add(" ".join(words[:-1]))

    if words[0] == "avg" and words[-1] == "spend":
        aliases.add(" ".join(words[1:]).replace("spend", "spending"))

    return {_normalize_text(alias) for alias in aliases if alias}


def _build_column_aliases() -> dict[str, set[str]]:
    alias_map = {
        column: _default_aliases(column)
        for column in ALL_COLUMNS
    }

    manual_aliases = {
        "monthly_income": {"income", "salary", "earnings"},
        "daily_internet_hours": {"internet hours", "online hours", "time online"},
        "smartphone_usage_years": {"smartphone usage", "phone usage", "phone usage years"},
        "social_media_hours": {"social media time"},
        "online_payment_trust_score": {"payment trust", "payment confidence", "trust score"},
        "tech_savvy_score": {"tech savvy", "tech savviness", "digital literacy"},
        "monthly_online_orders": {"online orders", "order count"},
        "monthly_store_visits": {"store visits", "offline visits", "shop visits", "in store visits"},
        "avg_online_spend": {"online spend", "online spending", "average online spend"},
        "avg_store_spend": {"store spend", "store spending", "offline spend", "offline spending", "in store spend"},
        "discount_sensitivity": {"discount sensitivity", "price sensitivity"},
        "return_frequency": {"returns", "return rate"},
        "avg_delivery_days": {"delivery days", "delivery time", "shipping time"},
        "delivery_fee_sensitivity": {"delivery fee sensitivity", "shipping fee sensitivity", "shipping sensitivity"},
        "free_return_importance": {"free return importance", "importance of free returns"},
        "product_availability_online": {"online availability", "product availability"},
        "impulse_buying_score": {"impulse buying", "impulse purchases"},
        "need_touch_feel_score": {"touch feel", "touch and feel", "need to touch"},
        "brand_loyalty_score": {"brand loyalty"},
        "environmental_awareness": {"eco awareness", "sustainability awareness"},
        "time_pressure_level": {"time pressure", "busy level"},
        "gender": {"gender split", "male female split"},
        "age_group": {"age group", "age groups", "different age groups"},
        "city_tier": {"city tier", "city tiers", "tier"},
        "shopping_preference": {"shopping preference", "shopping preferences", "preference", "shopper type"},
    }

    for column, aliases in manual_aliases.items():
        alias_map[column].update(_normalize_text(alias) for alias in aliases)

    return alias_map


COLUMN_ALIASES = _build_column_aliases()

CATEGORICAL_VALUE_ALIASES = {
    "gender": {
        "male": "Male",
        "female": "Female",
        "other gender": "Other",
    },
    "city_tier": {
        "tier 1": "Tier 1",
        "tier 2": "Tier 2",
        "tier 3": "Tier 3",
        "tier one": "Tier 1",
        "tier two": "Tier 2",
        "tier three": "Tier 3",
    },
    "shopping_preference": {
        "online shoppers": "Online",
        "online shopper": "Online",
        "online customers": "Online",
        "store shoppers": "Store",
        "store shopper": "Store",
        "store customers": "Store",
        "offline shoppers": "Store",
        "offline customers": "Store",
        "hybrid shoppers": "Hybrid",
        "hybrid shopper": "Hybrid",
        "hybrid customers": "Hybrid",
        "customers who prefer online": "Online",
        "customers who prefer store": "Store",
        "customers who prefer hybrid": "Hybrid",
    },
}

GROUP_BY_PATTERNS = (
    r"\bgrouped by (?P<chunk>.+)",
    r"\bsplit by (?P<chunk>.+)",
    r"\bbreakdown by (?P<chunk>.+)",
    r"\bby (?P<chunk>.+)",
    r"\bacross (?P<chunk>.+)",
    r"\bper (?P<chunk>.+)",
    r"\bfor each (?P<chunk>.+)",
)
GROUP_BY_SPLIT_PATTERN = re.compile(
    r"\b(?:where|with|for|among|who|that|which|having|when|after|before)\b"
)
FILTER_PATTERNS = (
    r"\bfor (?P<chunk>.+)",
    r"\bwhere (?P<chunk>.+)",
    r"\bamong (?P<chunk>.+)",
    r"\bwith (?P<chunk>.+)",
)
FILTER_SPLIT_PATTERN = re.compile(
    r"\b(?:by|across|per|grouped by|split by|breakdown by|for each|and|or)\b"
)
REFERENCE_STOPWORDS = {
    "a",
    "an",
    "all",
    "and",
    "any",
    "customer",
    "customers",
    "data",
    "dataset",
    "each",
    "for",
    "from",
    "get",
    "give",
    "in",
    "me",
    "of",
    "records",
    "results",
    "show",
    "the",
}
COMPARISON_KEYWORDS = ("compare", "comparison", "vs", "versus", "against", "both")
EXPLORATORY_KEYWORDS = (
    "interesting insight",
    "interesting insights",
    "dataset overview",
    "overview of this dataset",
    "overview of the dataset",
    "insights about this dataset",
    "insights on this dataset",
    "show insights",
    "explore this dataset",
    "analyze this dataset",
)


def _column_score(text: str, column: str) -> int:
    best_score = 0

    for alias in COLUMN_ALIASES[column]:
        if re.search(rf"\b{re.escape(alias)}\b", text):
            best_score = max(best_score, len(alias.split()))

    return best_score


def _find_columns(text: str, columns: list[str]) -> list[str]:
    matches = []

    for column in columns:
        score = _column_score(text, column)
        if score:
            matches.append((score, column))

    matches.sort(key=lambda item: (-item[0], columns.index(item[1])))
    return [column for _, column in matches]


def _extract_aggregation(query: str) -> str:
    patterns = (
        ("count", (r"\bhow many\b", r"\bnumber of\b", r"\bcount\b")),
        ("sum", (r"\btotal\b", r"\bsum\b")),
        ("mean", (r"\baverage\b", r"\bavg\b", r"\bmean\b")),
        ("min", (r"\bminimum\b", r"\bmin\b", r"\blowest\b", r"\bleast\b")),
        ("max", (r"\bmaximum\b", r"\bmax\b", r"\bhighest\b", r"\bmost\b")),
    )

    for aggregation, aliases in patterns:
        if any(re.search(alias, query) for alias in aliases):
            return aggregation

    return "mean"


def _extract_chart_preference(query: str) -> str:
    preferences = {
        "pie": r"\bpie chart\b|\bpie\b",
        "bar": r"\bbar chart\b|\bbar graph\b",
        "line": r"\bline chart\b|\bline graph\b",
        "scatter": r"\bscatter plot\b|\bscatter chart\b|\bscatter\b",
    }

    for chart_type, pattern in preferences.items():
        if re.search(pattern, query):
            return chart_type

    return "auto"


def _extract_categorical_mentions(query: str) -> dict[str, list[str]]:
    mentions: dict[str, list[str]] = {}

    for column, alias_map in CATEGORICAL_VALUE_ALIASES.items():
        detected_values: list[str] = []

        for alias, canonical_value in alias_map.items():
            if re.search(rf"\b{re.escape(_normalize_text(alias))}\b", query):
                if canonical_value not in detected_values:
                    detected_values.append(canonical_value)

        if detected_values:
            mentions[column] = detected_values

    return mentions


def _has_meaningful_tokens(chunk: str) -> bool:
    return any(
        token not in REFERENCE_STOPWORDS and not token.isdigit()
        for token in chunk.split()
    )


def _supports_reference(chunk: str) -> bool:
    return bool(
        _find_columns(chunk, ALL_COLUMNS)
        or _extract_categorical_mentions(chunk)
        or _extract_numeric_filters(chunk)
    )


def _normalize_group_by_columns(columns: list[str]) -> list[str]:
    normalized_columns: list[str] = []

    for column in columns:
        if column not in normalized_columns:
            normalized_columns.append(column)

    if "age_group" in normalized_columns and "age" in normalized_columns:
        normalized_columns = [column for column in normalized_columns if column != "age"]

    return normalized_columns[:2]


def _normalize_intent_from_query(query: str, intent: IntentModel) -> IntentModel:
    normalized_group_by = _normalize_group_by_columns(intent.group_by)

    if any(alias in query for alias in COLUMN_ALIASES["age_group"]):
        normalized_group_by = [
            "age_group",
            *[
                column
                for column in normalized_group_by
                if column not in {"age", "age_group"}
            ],
        ]

    return intent.model_copy(update={"group_by": normalized_group_by[:2]})


def _validate_requested_references(query: str) -> None:
    available_dimensions = ", ".join(CATEGORICAL_COLUMNS)
    available_filters = ", ".join(ALL_COLUMNS)

    for pattern in GROUP_BY_PATTERNS:
        match = re.search(pattern, query)
        if not match:
            continue

        chunk = GROUP_BY_SPLIT_PATTERN.split(match.group("chunk"), maxsplit=1)[0].strip()
        if not chunk or _supports_reference(chunk):
            continue

        if _has_meaningful_tokens(chunk):
            raise ValueError(
                f"'{chunk}' is not available in the dataset. "
                f"Available dimensions are: {available_dimensions}."
            )

    for pattern in FILTER_PATTERNS:
        for match in re.finditer(pattern, query):
            chunk = FILTER_SPLIT_PATTERN.split(match.group("chunk"), maxsplit=1)[0].strip()
            if not chunk or _supports_reference(chunk):
                continue

            if _has_meaningful_tokens(chunk):
                raise ValueError(
                    f"'{chunk}' is not available in the dataset. "
                    f"Available columns and filters are: {available_filters}."
                )


def _extract_group_by(query: str, mentions: dict[str, list[str]]) -> list[str]:
    detected: list[str] = []

    for pattern in GROUP_BY_PATTERNS:
        match = re.search(pattern, query)
        if not match:
            continue

        chunk = GROUP_BY_SPLIT_PATTERN.split(match.group("chunk"), maxsplit=1)[0]
        for column in _find_columns(chunk, ALL_COLUMNS):
            if column not in detected:
                detected.append(column)

        if detected:
            return _normalize_group_by_columns(detected)

    for column, values in mentions.items():
        if len(values) > 1 and column not in detected:
            detected.append(column)

    if detected:
        return _normalize_group_by_columns(detected)

    if any(keyword in query for keyword in ("compare", "comparison", "distribution", "breakdown", "split")):
        for column in _find_columns(query, CATEGORICAL_COLUMNS):
            if column not in detected:
                detected.append(column)

    return _normalize_group_by_columns(detected)


def _extract_numeric_filters(query: str) -> list[FilterModel]:
    filters: list[FilterModel] = []
    seen_filters: set[tuple[str, str, float]] = set()

    age_patterns = (
        (r"\bolder than (?P<value>\d+(?:\.\d+)?)\b", ">"),
        (r"\byounger than (?P<value>\d+(?:\.\d+)?)\b", "<"),
    )

    for pattern, operator in age_patterns:
        match = re.search(pattern, query)
        if match:
            value = float(match.group("value"))
            key = ("age", operator, value)
            if key not in seen_filters:
                filters.append(FilterModel(column="age", operator=operator, value=value))
                seen_filters.add(key)

    comparisons = (
        (">=", ("at least", "minimum of", "min of")),
        ("<=", ("at most", "maximum of", "max of")),
        (">", ("above", "over", "greater than", "more than")),
        ("<", ("below", "under", "less than")),
    )

    for column in NUMERIC_COLUMNS:
        aliases = sorted(COLUMN_ALIASES[column], key=len, reverse=True)

        for alias in aliases:
            for operator, phrases in comparisons:
                for phrase in phrases:
                    direct_pattern = rf"\b{re.escape(alias)}\s+{re.escape(phrase)}\s+(?P<value>\d+(?:\.\d+)?)\b"
                    reverse_pattern = rf"\b{re.escape(phrase)}\s+(?P<value>\d+(?:\.\d+)?)\s+{re.escape(alias)}\b"

                    for pattern in (direct_pattern, reverse_pattern):
                        match = re.search(pattern, query)
                        if not match:
                            continue

                        value = float(match.group("value"))
                        key = (column, operator, value)
                        if key not in seen_filters:
                            filters.append(FilterModel(column=column, operator=operator, value=value))
                            seen_filters.add(key)

    return filters


def _extract_filters(query: str, group_by: list[str], mentions: dict[str, list[str]]) -> list[FilterModel]:
    filters = _extract_numeric_filters(query)

    for column, values in mentions.items():
        if column in group_by:
            continue

        if len(values) == 1:
            filters.append(FilterModel(column=column, operator="==", value=values[0]))

    return filters


def _extract_metric(query: str, aggregation: str) -> str:
    metric_matches = _find_columns(query, NUMERIC_COLUMNS)
    if metric_matches:
        return metric_matches[0]

    if aggregation == "count":
        return "age"

    raise ValueError(
        "Could not infer a numeric metric from the query. "
        f"Available metrics: {', '.join(NUMERIC_COLUMNS)}"
    )


def _derive_comparison_metrics(query: str) -> list[str]:
    derived_metrics: list[str] = []

    if "online" in query and "store" in query:
        if "spend" in query or "spending" in query:
            derived_metrics.extend(["avg_online_spend", "avg_store_spend"])

        if (
            "behavior" in query
            or "shopping behavior" in query
            or "order" in query
            or "orders" in query
            or "visit" in query
            or "visits" in query
        ):
            derived_metrics.extend(["monthly_online_orders", "monthly_store_visits"])

    return derived_metrics


def is_exploratory_query(query: str) -> bool:
    normalized_query = _normalize_text(query)

    return (
        any(keyword in normalized_query for keyword in EXPLORATORY_KEYWORDS)
        or ("dataset" in normalized_query and "insight" in normalized_query)
        or ("dataset" in normalized_query and "overview" in normalized_query)
    )


def build_exploratory_intents() -> list[IntentModel]:
    return [
        IntentModel(
            metric="avg_online_spend",
            aggregation="mean",
            group_by=["city_tier"],
            filters=[],
            chart_preference="auto",
        ),
        IntentModel(
            metric="avg_store_spend",
            aggregation="mean",
            group_by=["shopping_preference"],
            filters=[],
            chart_preference="auto",
        ),
        IntentModel(
            metric="tech_savvy_score",
            aggregation="mean",
            group_by=["age"],
            filters=[],
            chart_preference="auto",
        ),
        IntentModel(
            metric="age",
            aggregation="count",
            group_by=["gender"],
            filters=[],
            chart_preference="auto",
        ),
    ]


def _extract_intent_with_rules(query: str) -> IntentModel:
    normalized_query = _normalize_text(query)
    if not normalized_query:
        raise ValueError("Query must not be empty.")

    _validate_requested_references(normalized_query)
    mentions = _extract_categorical_mentions(normalized_query)
    aggregation = _extract_aggregation(normalized_query)
    group_by = _extract_group_by(normalized_query, mentions)
    filters = _extract_filters(normalized_query, group_by, mentions)
    metric = _extract_metric(normalized_query, aggregation)
    chart_preference = _extract_chart_preference(normalized_query)

    return IntentModel(
        metric=metric,
        aggregation=aggregation,
        group_by=group_by,
        filters=filters,
        chart_preference=chart_preference,
    )


def _extract_intent_with_llm(query: str) -> IntentModel:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.1,
        max_tokens=500,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": query},
        ],
    )

    raw_text = response.choices[0].message.content.strip()

    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"LLM returned invalid JSON. Raw response: {raw_text[:200]}. Error: {exc}"
        ) from exc

    try:
        return IntentModel(**parsed)
    except Exception as exc:
        raise ValueError(f"LLM output did not match expected structure: {exc}") from exc


def extract_intent(query: str) -> IntentModel:
    normalized_query = _normalize_text(query)
    if not normalized_query:
        raise ValueError("Query must not be empty.")

    _validate_requested_references(normalized_query)
    llm_error: Exception | None = None

    try:
        intent = _extract_intent_with_llm(query)
        return _normalize_intent_from_query(normalized_query, intent)
    except (OpenAIError, ValueError) as exc:
        llm_error = exc

    try:
        intent = _extract_intent_with_rules(query)
        return _normalize_intent_from_query(normalized_query, intent)
    except ValueError as fallback_error:
        if llm_error is None:
            raise

        raise ValueError(
            "Intent extraction failed with both the OpenAI parser and the local fallback. "
            f"OpenAI error: {llm_error}. "
            f"Fallback error: {fallback_error}"
        ) from fallback_error


def expand_comparison_intents(query: str, base_intent: IntentModel) -> list[IntentModel]:
    normalized_query = _normalize_text(query)
    if not any(keyword in normalized_query for keyword in COMPARISON_KEYWORDS):
        return [base_intent]

    derived_metrics = _derive_comparison_metrics(normalized_query)
    matched_metrics = _find_columns(normalized_query, NUMERIC_COLUMNS)
    candidate_metrics = [*derived_metrics, *matched_metrics]

    if derived_metrics and ("age group" in normalized_query or "age groups" in normalized_query):
        candidate_metrics = [metric for metric in candidate_metrics if metric != "age"]

    ordered_metrics: list[str] = []

    seed_metrics = candidate_metrics if candidate_metrics else [base_intent.metric]
    if base_intent.metric in candidate_metrics or not candidate_metrics:
        seed_metrics = [base_intent.metric, *candidate_metrics]

    for metric in seed_metrics:
        if metric not in ordered_metrics:
            ordered_metrics.append(metric)

    if len(ordered_metrics) <= 1:
        return [base_intent]

    return [
        base_intent.model_copy(update={"metric": metric})
        for metric in ordered_metrics[:4]
    ]
