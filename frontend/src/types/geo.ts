export interface GeoRegion {
  id: string;
  regionName: string;
  regionCode?: string | null;
}

export interface GeoRegionDetail extends GeoRegion {
  status: string;
  createdAt: string;
  updatedAt: string;
  stateCount: number;
  states: GeoState[];
}

export interface GeoState {
  id: string;
  stateName: string;
  stateCode: string;
  regionId?: string | null;
}

export interface GeoDistrict {
  id: string;
  districtName: string;
  districtCode: string;
  stateId: string;
}
