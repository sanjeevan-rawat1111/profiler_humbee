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
import { getRegions as getGeoRegions, getStates, getDistrictsByState } from '../controllers/geo';
import { getRegions, createRegion, updateRegion, deleteRegion } from '../controllers/region';
import { adminMiddleware } from '../middleware/admin';
import { adminOnlyMiddleware } from '../middleware/adminOnly';
import { validateBody } from '../middleware/validate';
import { createUserSchema, updateUserSchema, regionSchema, updateRegionSchema } from '../validators/schemas';
import { z } from 'zod';

const router = Router();

const resetPasswordSchema = z.object({
  password: z.string()
    .regex(/^(?=.*[A-Z])(?=.*\d).{6,}$/, 'Password must be at least 6 characters, contain 1 uppercase letter and 1 number'),
});

router.use(adminMiddleware);

// Geo master
router.get('/geo/regions', getGeoRegions);
router.get('/geo/states', getStates);
router.get('/geo/states/:stateId/districts', getDistrictsByState);

// Region management (admin only)
router.get('/regions', adminOnlyMiddleware, getRegions);
router.post('/regions', adminOnlyMiddleware, validateBody(regionSchema), createRegion);
router.put('/regions/:id', adminOnlyMiddleware, validateBody(updateRegionSchema), updateRegion);
router.delete('/regions/:id', adminOnlyMiddleware, deleteRegion);

// Users (admin only)
router.get('/users', adminOnlyMiddleware, getUsers);
router.get('/users/:id/password', adminOnlyMiddleware, getUserPassword);
router.get('/users/export-csv', adminOnlyMiddleware, exportUsersCsv);
router.get('/users/export-excel', adminOnlyMiddleware, exportUsersExcel);
router.post('/users', adminOnlyMiddleware, validateBody(createUserSchema), createUser);
router.put('/users/:id', adminOnlyMiddleware, validateBody(updateUserSchema), updateUser);
router.post('/users/:id/reset-password', adminOnlyMiddleware, validateBody(resetPasswordSchema), resetUserPassword);
router.delete('/users/:id', adminOnlyMiddleware, deleteUser);

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
