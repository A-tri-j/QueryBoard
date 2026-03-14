export const TIERS = {
  free: {
    label: 'Free',
    price: 0,
    queries: 10,
    uploads: 3,
    tokens: 1000,
  },
  pro: {
    label: 'Pro',
    price: 9.99,
    queries: 200,
    uploads: 20,
    tokens: 50000,
  },
  ultra: {
    label: 'Ultra',
    price: 49.99,
    queries: Infinity,
    uploads: Infinity,
    tokens: Infinity,
  },
} as const

export type TierKey = keyof typeof TIERS

export function isLimitReached(
  tier: TierKey,
  used: number,
  type: 'queries' | 'uploads' | 'tokens'
): boolean {
  const limit = TIERS[tier][type]
  return limit !== Infinity && used >= limit
}
