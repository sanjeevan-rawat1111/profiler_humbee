export type DirectoryDownloadMode = 'normal' | 'master';

export interface SubmissionFilters {
  search: string;
  user: string;
  region: string;
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
  region: string;
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
    sapCode: string;
    customerMobileNumber: string;
  }[];
  users: string[];
  regions: string[];
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
  name: string;
  user: string;
  state: string;
  district: string;
  eventType: string;
  period: DashboardPeriod;
  fromDate: string;
  toDate: string;
}

export const defaultAuditFilters: AuditFilters = {
  search: '',
  name: '',
  user: '',
  state: '',
  district: '',
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
    regions: string[];
    users: string[];
  };
  filterOptions: {
    regions: string[];
    users: { name: string; mobileNumber: string; region: string }[];
  };
  summary: {
    totalSubmissions: number;
    activeUsers: number;
    activeRegions: number;
    inactiveUsers: number;
  };
  inactiveUsers: {
    name: string;
    mobileNumber: string;
    region: string;
    lastSubmission: string | null;
  }[];
  regions: {
    totalChart: { region: string; uniqueCount: number }[];
    contribution: { region: string; uniqueCount: number; percentage: number }[];
  };
  users: {
    topChart: { name: string; mobileNumber: string; uniqueCount: number }[];
    activityDistribution: { name: string; mobileNumber: string; uniqueCount: number; percentage: number }[];
  };
  topPerformers: {
    regions: { rank: number; region: string; totalSubmissions: number }[];
    users: { rank: number; name: string; mobileNumber: string; totalSubmissions: number }[];
  };
}

export interface GlobalDashboardFilters {
  period: DashboardPeriod;
  fromDate: string;
  toDate: string;
  regions: string[];
  users: string[];
}

export const defaultGlobalDashboardFilters: GlobalDashboardFilters = {
  period: 'week',
  fromDate: '',
  toDate: '',
  regions: [],
  users: [],
};

export interface UserManagementFilters {
  region: string;
  mobileNumbers: string[];
  role: string;
  statuses: string[];
}

export const defaultUserManagementFilters: UserManagementFilters = {
  region: '',
  mobileNumbers: [],
  role: '',
  statuses: [],
};

export const defaultFilters: SubmissionFilters = {
  search: '',
  user: '',
  region: '',
  sapCode: '',
  mobileNumber: '',
  fromDate: '',
  toDate: '',
  period: 'week',
};
