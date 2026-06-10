export const EXCLUDED_ANALYTICS_USERS = ['0000000000'] as const;

export function isExcludedAnalyticsMobile(mobileNumber: string): boolean {
  return (EXCLUDED_ANALYTICS_USERS as readonly string[]).includes(mobileNumber);
}
