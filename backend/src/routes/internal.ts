import { Router } from 'express';
import {
  getUsers, getUserPassword, createUser, updateUser, deleteUser, resetUserPassword,
  exportUsersCsv, exportUsersExcel,
  getSubmissions, getSubmissionKpis, exportSubmissions,
} from '../controllers/internal';
import {
  getSubmissionDirectory, getUserSubmissionDetails,
  exportDirectoryCsv, exportDirectoryExcel,
} from '../controllers/directory';
import {
  getKpiDashboard, exportKpiCsv, exportKpiExcel,
} from '../controllers/kpiDashboard';
import {
  getUnifiedDashboard,
  getTodayDashboard,
  getRegionDashboard,
  getUserDashboard,
  getLeaderboardDashboard,
} from '../controllers/dashboardAnalytics';
import {
  getAuditLogs, getAuditLogDetails, exportAuditLogsCsv, exportAuditLogsExcel,
} from '../controllers/auditLogs';
import { getStates, getDistrictsByState } from '../controllers/geo';
import { adminMiddleware } from '../middleware/admin';
import { validateBody } from '../middleware/validate';
import { createUserSchema, updateUserSchema } from '../validators/schemas';
import { z } from 'zod';

const router = Router();

const resetPasswordSchema = z.object({
  password: z.string()
    .regex(/^(?=.*[A-Z])(?=.*\d).{6,}$/, 'Password must be at least 6 characters, contain 1 uppercase letter and 1 number'),
});

router.use(adminMiddleware);

// Geo master
router.get('/geo/states', getStates);
router.get('/geo/states/:stateId/districts', getDistrictsByState);

// Users
router.get('/users', getUsers);
router.get('/users/:id/password', getUserPassword);
router.get('/users/export-csv', exportUsersCsv);
router.get('/users/export-excel', exportUsersExcel);
router.post('/users', validateBody(createUserSchema), createUser);
router.put('/users/:id', validateBody(updateUserSchema), updateUser);
router.post('/users/:id/reset-password', validateBody(resetPasswordSchema), resetUserPassword);
router.delete('/users/:id', deleteUser);

// Submission directory
router.get('/submissions/directory', getSubmissionDirectory);
router.get('/submissions/directory/:userId', getUserSubmissionDetails);
router.get('/submissions/export-csv', exportDirectoryCsv);
router.get('/submissions/export-excel', exportDirectoryExcel);

// Legacy submissions endpoints
router.get('/submissions', getSubmissions);
router.get('/submissions/kpis', getSubmissionKpis);
router.get('/submissions/export', exportSubmissions);

// KPI dashboard (legacy)
router.get('/kpi/dashboard', getKpiDashboard);
router.get('/kpi/export-csv', exportKpiCsv);
router.get('/kpi/export-excel', exportKpiExcel);

// Analytics dashboards
router.get('/dashboard', getUnifiedDashboard);
router.get('/dashboard/today', getTodayDashboard);
router.get('/dashboard/regions', getRegionDashboard);
router.get('/dashboard/users', getUserDashboard);
router.get('/dashboard/leaderboard', getLeaderboardDashboard);

// Audit logs
router.get('/audit-logs/export-csv', exportAuditLogsCsv);
router.get('/audit-logs/export-excel', exportAuditLogsExcel);
router.get('/audit-logs/:userMobile/activity', getAuditLogDetails);
router.get('/audit-logs', getAuditLogs);

export default router;
