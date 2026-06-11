import type { GeoDistrict, GeoState } from './geo';

export type DirectoryDownloadMode = 'normal' | 'master';

export type GeographyLevel = 'region' | 'state' | 'district';

export interface SubmissionFilters {
  search: string;
  names: string[];
  userMobiles: string[];
  regionId: string;
  stateId: string;
  districtId: string;
  sapCode: string;
  mobileNumber: string;
  fromDate: string;
  toDate: string;
  period: DashboardPeriod;
}

export interface DirectoryRecord {
  userId: string;
  userName: string;
  userMobileNumber: string;
  state: string;
  district: string;
  sapCode: string;
  mobileNumber: string;
  submissionCount: number;
  firstSubmission: string;
  lastSubmission: string;
}

export interface SubmissionDetail {
  id: string;
  timestamp: string;
  sapCode: string;
  mobileNumber: string;
}

export interface KpiDashboardData {
  lastUpdated: string;
  summary: {
    topPerformer: { name: string; mobileNumber: string; uniqueCount: number } | null;
    todaysSubmissions: number;
    totalSubmissions: number;
    activeUsers: number;
    avgSubmissionsPerDay: number;
    lastActivity: string | null;
  };
  userPerformance: { name: string; mobileNumber: string; uniqueCount: number }[];
  trend: { date: string; uniqueCount: number }[];
  contribution: { name: string; mobileNumber: string; uniqueCount: number; percentage: number }[];
  hourlyActivity: { hour: string; uniqueCount: number }[];
  topPerformingUsers: {
    rank: number;
    name: string;
    mobileNumber: string;
    uniqueSubmissions: number;
    firstSubmission: string | null;
    lastSubmission: string | null;
  }[];
  recentActivity: {
    timestamp: string;
    userName: string;
    userMobileNumber: string;
    state: string;
    district: string;
    sapCode: string;
    customerMobileNumber: string;
  }[];
  users: string[];
  states: string[];
  districts: string[];
}

export interface AuditSummaryRecord {
  userMobile: string;
  name: string;
  state: string;
  district: string;
  firstActivity: string | null;
  lastActivity: string | null;
}

export interface AuditActivityRecord {
  id: string;
  eventType: string;
  timestamp: string;
  status: string;
  reason: string;
}

export interface AuditActivityDetail {
  name: string;
  userMobile: string;
  state: string;
  district: string;
  activities: AuditActivityRecord[];
}

export interface AuditFilters {
  search: string;
  names: string[];
  userMobiles: string[];
  regionId: string;
  stateId: string;
  districtId: string;
  eventType: string;
  period: DashboardPeriod;
  fromDate: string;
  toDate: string;
}

export const defaultAuditFilters: AuditFilters = {
  search: '',
  names: [],
  userMobiles: [],
  regionId: '',
  stateId: '',
  districtId: '',
  eventType: '',
  period: 'week',
  fromDate: '',
  toDate: '',
};

export interface DBUser {
  id: string;
  name: string;
  mobileNumber: string;
  role: string;
  region: string;
  stateId: string | null;
  districtId: string | null;
  state: string;
  district: string;
  assignedRegionIds?: string[];
  assignedRegionNames?: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type DashboardPeriod = 'today' | 'week' | 'month' | 'custom';

export interface UnifiedDashboardData {
  lastUpdated: string;
  filters: {
    period: DashboardPeriod;
    fromDate: string;
    toDate: string;
    regionId: string;
    stateId: string;
    districtId: string;
    names: string[];
    userMobiles: string[];
    sapCode: string;
    mobileNumber: string;
  };
  filterOptions: {
    regions: import('./geo').GeoRegion[];
    states: GeoState[];
    districts: GeoDistrict[];
    users: {
      name: string;
      mobileNumber: string;
      stateId: string | null;
      districtId: string | null;
      state: string;
      district: string;
    }[];
  };
  summary: {
    totalSubmissions: number;
    activeUsers: number;
    activeStates: number;
    inactiveUsers: number;
  };
  inactiveUsers: {
    name: string;
    mobileNumber: string;
    state: string;
    district: string;
    lastSubmission: string | null;
  }[];
  regions: {
    totalChart: { region: string; uniqueCount: number }[];
    contribution: { region: string; uniqueCount: number; percentage: number }[];
  };
  states: {
    totalChart: { state: string; uniqueCount: number }[];
    contribution: { state: string; uniqueCount: number; percentage: number }[];
  };
  districts: {
    totalChart: { district: string; state: string; uniqueCount: number }[];
    contribution: {
      district: string;
      state: string;
      label: string;
      uniqueCount: number;
      percentage: number;
    }[];
  };
  users: {
    topChart: { name: string; mobileNumber: string; uniqueCount: number }[];
    activityDistribution: { name: string; mobileNumber: string; uniqueCount: number; percentage: number }[];
  };
}

export interface GlobalDashboardFilters {
  period: DashboardPeriod;
  fromDate: string;
  toDate: string;
  regionId: string;
  stateId: string;
  districtId: string;
  geoLevel: GeographyLevel;
  users: string[];
}

export const defaultGlobalDashboardFilters: GlobalDashboardFilters = {
  period: 'week',
  fromDate: '',
  toDate: '',
  regionId: '',
  stateId: '',
  districtId: '',
  geoLevel: 'state',
  users: [],
};

export interface UserManagementFilters {
  regionId: string;
  stateId: string;
  districtId: string;
  names: string[];
  mobileNumbers: string[];
  role: string;
  statuses: string[];
}

export const defaultUserManagementFilters: UserManagementFilters = {
  regionId: '',
  stateId: '',
  districtId: '',
  names: [],
  mobileNumbers: [],
  role: '',
  statuses: [],
};

export const defaultFilters: SubmissionFilters = {
  search: '',
  names: [],
  userMobiles: [],
  regionId: '',
  stateId: '',
  districtId: '',
  sapCode: '',
  mobileNumber: '',
  fromDate: '',
  toDate: '',
  period: 'week',
};
