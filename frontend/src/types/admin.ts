export type DirectoryDownloadMode = 'normal' | 'master';

export interface SubmissionFilters {
  search: string;
  user: string;
  state: string;
  district: string;
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
  state: string;
  district: string;
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
    states: string[];
    districts: string[];
    users: string[];
  };
  filterOptions: {
    states: string[];
    districts: string[];
    users: { name: string; mobileNumber: string; state: string; district: string }[];
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
  states: {
    totalChart: { state: string; uniqueCount: number }[];
    contribution: { state: string; uniqueCount: number; percentage: number }[];
  };
  users: {
    topChart: { name: string; mobileNumber: string; uniqueCount: number }[];
    activityDistribution: { name: string; mobileNumber: string; uniqueCount: number; percentage: number }[];
  };
  topPerformers: {
    states: { rank: number; state: string; totalSubmissions: number }[];
    users: { rank: number; name: string; mobileNumber: string; totalSubmissions: number }[];
  };
}

export interface GlobalDashboardFilters {
  period: DashboardPeriod;
  fromDate: string;
  toDate: string;
  states: string[];
  districts: string[];
  users: string[];
}

export const defaultGlobalDashboardFilters: GlobalDashboardFilters = {
  period: 'week',
  fromDate: '',
  toDate: '',
  states: [],
  districts: [],
  users: [],
};

export interface UserManagementFilters {
  state: string;
  district: string;
  mobileNumbers: string[];
  role: string;
  statuses: string[];
}

export const defaultUserManagementFilters: UserManagementFilters = {
  state: '',
  district: '',
  mobileNumbers: [],
  role: '',
  statuses: [],
};

export const defaultFilters: SubmissionFilters = {
  search: '',
  user: '',
  state: '',
  district: '',
  sapCode: '',
  mobileNumber: '',
  fromDate: '',
  toDate: '',
  period: 'week',
};
