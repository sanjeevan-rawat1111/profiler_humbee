export interface SubmissionFilters {
  search: string;
  user: string;
  region: string;
  sapCode: string;
  mobileNumber: string;
  singleDay: boolean;
  date: string;
  fromDate: string;
  toDate: string;
  period: 'today' | '7' | '30' | 'custom';
}

export interface DirectoryRecord {
  userId: string;
  username: string;
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
    topPerformer: { username: string; uniqueCount: number } | null;
    todaysSubmissions: number;
    totalSubmissions: number;
    activeUsers: number;
    avgSubmissionsPerDay: number;
    lastActivity: string | null;
  };
  userPerformance: { username: string; uniqueCount: number }[];
  trend: { date: string; uniqueCount: number }[];
  contribution: { username: string; uniqueCount: number; percentage: number }[];
  hourlyActivity: { hour: string; uniqueCount: number }[];
  topPerformingUsers: {
    rank: number;
    username: string;
    uniqueSubmissions: number;
    firstSubmission: string | null;
    lastSubmission: string | null;
  }[];
  recentActivity: {
    timestamp: string;
    username: string;
    sapCode: string;
    mobileNumber: string;
  }[];
  users: string[];
  regions: string[];
}

export interface AuditLogRecord {
  id: string;
  user: string;
  region: string;
  timestamp: string;
  eventType: string;
  status: string;
  reason: string | null;
}

export interface DBUser {
  id: string;
  username: string;
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
    users: { username: string; region: string }[];
  };
  summary: {
    totalSubmissions: number;
    activeUsers: number;
    activeRegions: number;
    inactiveUsers: number;
  };
  inactiveUsers: {
    username: string;
    region: string;
    lastSubmission: string | null;
  }[];
  regions: {
    totalChart: { region: string; uniqueCount: number }[];
    contribution: { region: string; uniqueCount: number; percentage: number }[];
  };
  users: {
    topChart: { username: string; uniqueCount: number }[];
    activityDistribution: { username: string; uniqueCount: number; percentage: number }[];
  };
  topPerformers: {
    regions: { rank: number; region: string; totalSubmissions: number }[];
    users: { rank: number; username: string; totalSubmissions: number }[];
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
  users: string[];
  statuses: string[];
}

export const defaultUserManagementFilters: UserManagementFilters = {
  region: '',
  users: [],
  statuses: [],
};

export const defaultFilters: SubmissionFilters = {
  search: '',
  user: '',
  region: '',
  sapCode: '',
  mobileNumber: '',
  singleDay: false,
  date: '',
  fromDate: '',
  toDate: '',
  period: '7',
};
