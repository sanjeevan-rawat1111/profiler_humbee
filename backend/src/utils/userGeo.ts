export function userGeoFields(state: string, district: string) {
  return { state, district, region: state };
}
