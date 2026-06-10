export const EXCLUDED_ANALYTICS_USERS = ['0000000000'] as const;

export function isExcludedAnalyticsMobile(mobileNumber: string | undefined | null): boolean {
  if (!mobileNumber) return false;
  return (EXCLUDED_ANALYTICS_USERS as readonly string[]).includes(mobileNumber);
}

export function excludedAnalyticsMobileNumbers(): string[] {
  return [...EXCLUDED_ANALYTICS_USERS];
}
