export const EXCLUDED_ANALYTICS_USERS : string[] = ['0000000000'];

export function isExcludedAnalyticsMobile(mobileNumber: string): boolean {
  return (EXCLUDED_ANALYTICS_USERS as readonly string[]).includes(mobileNumber);
}
