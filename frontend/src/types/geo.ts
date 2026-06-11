export interface GeoState {
  id: string;
  stateName: string;
  stateCode: string;
}

export interface GeoDistrict {
  id: string;
  districtName: string;
  districtCode: string;
  stateId: string;
}
