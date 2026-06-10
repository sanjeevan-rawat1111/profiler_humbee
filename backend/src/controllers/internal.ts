import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma/client';
import { excludedAnalyticsMobileNumbers, isExcludedAnalyticsMobile } from '../config/excludedAnalyticsUsers';
import { sendCsv, sendExcel } from '../utils/exportHelpers';
import { parseArrayParam } from '../utils/dashboardAnalytics';

function parseUserListQuery(query: Record<string, unknown>) {
  const region = String(query.region || '').trim();
  const role = String(query.role || '').trim();
  const mobileNumbers = parseArrayParam(query.mobileNumbers ?? query.users ?? query.user);
  const statuses = parseArrayParam(query.status ?? query.statuses).map((value) => value.toLowerCase());
  return { region, role, mobileNumbers, statuses };
}

function buildUserListWhere(filters: ReturnType<typeof parseUserListQuery>) {
  const where: Record<string, unknown> = {};
  if (filters.region) where.region = { contains: filters.region };
  if (filters.role) where.role = filters.role;
  if (filters.mobileNumbers.length) where.mobileNumber = { in: filters.mobileNumbers };
  if (filters.statuses.length) where.status = { in: filters.statuses };
  return where;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// ─── USERS ───────────────────────────────────────────────────────────────────

export async function getUsers(req: Request, res: Response) {
  const filters = parseUserListQuery(req.query);
  try {
    const [users, allMobileNumbers] = await Promise.all([
      prisma.user.findMany({
        where: buildUserListWhere(filters),
        select: { id: true, mobileNumber: true, role: true, region: true, status: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findMany({
        select: { mobileNumber: true },
        orderBy: { mobileNumber: 'asc' },
      }),
    ]);
    return res.status(200).json({
      success: true,
      data: {
        users,
        filterOptions: { mobileNumbers: allMobileNumbers.map((user) => user.mobileNumber) },
      },
    });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function createUser(req: Request, res: Response) {
  const { mobileNumber, password, role, status, region } = req.body;
  try {
    const existingMobile = await prisma.user.findUnique({ where: { mobileNumber } });
    if (existingMobile) {
      return res.status(400).json({ success: false, message: 'Mobile Number already exists.' });
    }
    const user = await prisma.user.create({
      data: {
        mobileNumber,
        passwordHash: await hashPassword(password),
        plainPassword: password,
        role: role || 'user',
        region,
        status: status || 'active',
      },
      select: { id: true, mobileNumber: true, role: true, region: true, status: true, createdAt: true },
    });
    return res.status(201).json({ success: true, data: user });
  } catch (error) {
    console.error('createUser error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const { mobileNumber, password, role, status, region } = req.body;
  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const updateData: Record<string, unknown> = {};
    if (mobileNumber) {
      const dup = await prisma.user.findFirst({ where: { mobileNumber, id: { not: id } } });
      if (dup) return res.status(400).json({ success: false, message: 'Mobile Number already exists.' });
      updateData.mobileNumber = mobileNumber;
    }
    if (password) {
      updateData.passwordHash = await hashPassword(password);
      updateData.plainPassword = password;
    }
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (region) updateData.region = region;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, mobileNumber: true, role: true, region: true, status: true, updatedAt: true },
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('updateUser error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function resetUserPassword(req: Request, res: Response) {
  const { id } = req.params;
  const { password } = req.body;
  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(password),
        plainPassword: password,
      },
    });
    return res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('resetUserPassword error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getUserPassword(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { plainPassword: true },
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({
      success: true,
      data: { password: user.plainPassword ?? null },
    });
  } catch (error) {
    console.error('getUserPassword error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function exportUsersCsv(req: Request, res: Response) {
  const filters = parseUserListQuery(req.query);
  try {
    const users = await prisma.user.findMany({
      where: buildUserListWhere(filters),
      select: { mobileNumber: true, region: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return sendCsv(
      res,
      'users.csv',
      ['Mobile Number', 'Region', 'Role', 'Status', 'Created At'],
      users.map((u) => [u.mobileNumber, u.region, u.role, u.status, u.createdAt.toISOString()])
    );
  } catch (error) {
    console.error('exportUsersCsv error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function exportUsersExcel(req: Request, res: Response) {
  const filters = parseUserListQuery(req.query);
  try {
    const users = await prisma.user.findMany({
      where: buildUserListWhere(filters),
      select: { mobileNumber: true, region: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return sendExcel(
      res,
      'users.xls',
      ['Mobile Number', 'Region', 'Role', 'Status', 'Created At'],
      users.map((u) => [u.mobileNumber, u.region, u.role, u.status, u.createdAt.toISOString()])
    );
  } catch (error) {
    console.error('exportUsersExcel error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    await prisma.user.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('deleteUser error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── SUBMISSIONS ─────────────────────────────────────────────────────────────

type SubmissionKpiRow = {
  sapCode: string;
  mobileNumber: string;
  submittedAt: Date;
  user: { mobileNumber: string; role: string } | null;
};

function parseDateRange(date?: unknown) {
  if (!date) return undefined;
  const d = new Date(String(date));
  if (isNaN(d.getTime())) return undefined;
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end = new Date(d); end.setHours(23, 59, 59, 999);
  return { gte: start, lte: end };
}

function getTrendDateRange(period?: unknown, customStart?: unknown, customEnd?: unknown) {
  if (period === 'custom') {
    const start = customStart ? new Date(String(customStart)) : null;
    const end = customEnd ? new Date(String(customEnd)) : null;
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return undefined;
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  const days = period === '30' ? 30 : 7;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { gte: start, lte: end };
}

function uniqueSubmissionKey(row: Pick<SubmissionKpiRow, 'sapCode' | 'mobileNumber'>) {
  return `${row.sapCode.trim().toLowerCase()}::${row.mobileNumber.trim()}`;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getSubmissions(req: Request, res: Response) {
  const { sapCode, mobile, mobileNumber, date, user, sort = 'desc' } = req.query;
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
  const skip = (page - 1) * limit;
  const mobileFilter = (mobile || mobileNumber) as string | undefined;

  try {
    const where: Record<string, unknown> = {};
    if (sapCode) where.sapCode = { contains: String(sapCode) };
    if (mobileFilter) where.mobileNumber = { contains: String(mobileFilter) };
    const submittedAt = parseDateRange(date);
    if (submittedAt) where.submittedAt = submittedAt;
    where.user = user
      ? {
          AND: [
            { mobileNumber: { contains: String(user) } },
            { mobileNumber: { notIn: excludedAnalyticsMobileNumbers() } },
          ],
        }
      : { mobileNumber: { notIn: excludedAnalyticsMobileNumbers() } };

    const [total, submissions] = await prisma.$transaction([
      prisma.submission.count({ where }),
      prisma.submission.findMany({
        where,
        select: {
          id: true,
          sapCode: true,
          mobileNumber: true,
          submittedAt: true,
          user: { select: { mobileNumber: true } },
        },
        orderBy: { submittedAt: sort === 'asc' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        submissions,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('getSubmissions error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getSubmissionKpis(req: Request, res: Response) {
  const {
    sapCode,
    mobile,
    mobileNumber,
    date,
    rankingSort = 'desc',
    trendUser,
    period = '7',
    customStart,
    customEnd,
  } = req.query;
  const mobileFilter = (mobile || mobileNumber) as string | undefined;

  try {
    const baseWhere: Record<string, unknown> = {};
    if (sapCode) baseWhere.sapCode = { contains: String(sapCode) };
    if (mobileFilter) baseWhere.mobileNumber = { contains: String(mobileFilter) };
    const submittedAt = parseDateRange(date);
    if (submittedAt) baseWhere.submittedAt = submittedAt;

    const regularUsers = await prisma.user.findMany({
      where: {
        role: 'user',
        mobileNumber: { notIn: excludedAnalyticsMobileNumbers() },
      },
      select: { id: true, mobileNumber: true },
      orderBy: { mobileNumber: 'asc' },
    });

    const rankingRows: SubmissionKpiRow[] = await prisma.submission.findMany({
      where: {
        ...baseWhere,
        user: {
          role: 'user',
          mobileNumber: { notIn: excludedAnalyticsMobileNumbers() },
        },
      },
      select: {
        sapCode: true,
        mobileNumber: true,
        submittedAt: true,
        user: { select: { mobileNumber: true, role: true } },
      },
    });

    const rankingByUser = new Map<string, Set<string>>();
    rankingRows.forEach((row) => {
      if (!row.user || row.user.role !== 'user' || isExcludedAnalyticsMobile(row.user.mobileNumber)) return;
      const userMobile = row.user.mobileNumber;
      if (!rankingByUser.has(userMobile)) rankingByUser.set(userMobile, new Set());
      rankingByUser.get(userMobile)?.add(uniqueSubmissionKey(row));
    });

    const ranking = Array.from(rankingByUser.entries())
      .map(([mobileNumber, uniqueCount]) => ({ mobileNumber, uniqueCount: uniqueCount.size }))
      .sort((a, b) => {
        const diff = a.uniqueCount - b.uniqueCount;
        return rankingSort === 'asc' ? diff || a.mobileNumber.localeCompare(b.mobileNumber) : -diff || a.mobileNumber.localeCompare(b.mobileNumber);
      });

    const usersWithoutSubmissions = regularUsers
      .filter((regularUser) => !rankingByUser.has(regularUser.mobileNumber))
      .map((regularUser) => ({ mobileNumber: regularUser.mobileNumber, uniqueCount: 0 }));

    const trendRange = getTrendDateRange(period, customStart, customEnd);
    const trendUserFilter = trendUser
      ? { mobileNumber: { contains: String(trendUser) } }
      : { mobileNumber: { notIn: excludedAnalyticsMobileNumbers() } };
    const trendWhere: Record<string, unknown> = {
      ...baseWhere,
      ...(trendRange ? { submittedAt: trendRange } : {}),
      user: {
        role: 'user',
        ...trendUserFilter,
      },
    };

    const trendRows: SubmissionKpiRow[] = await prisma.submission.findMany({
      where: trendWhere,
      select: {
        sapCode: true,
        mobileNumber: true,
        submittedAt: true,
        user: { select: { mobileNumber: true, role: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });

    const trendByDay = new Map<string, Set<string>>();
    trendRows.forEach((row) => {
      if (!row.user || row.user.role !== 'user' || isExcludedAnalyticsMobile(row.user.mobileNumber)) return;
      const day = toDateKey(row.submittedAt);
      if (!trendByDay.has(day)) trendByDay.set(day, new Set());
      trendByDay.get(day)?.add(uniqueSubmissionKey(row));
    });

    if (trendRange) {
      const cursor = new Date(trendRange.gte);
      while (cursor <= trendRange.lte) {
        const day = toDateKey(cursor);
        if (!trendByDay.has(day)) trendByDay.set(day, new Set());
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const trend = Array.from(trendByDay.entries())
      .map(([dateKey, uniqueCount]) => ({ date: dateKey, uniqueCount: uniqueCount.size }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.status(200).json({
      success: true,
      data: {
        ranking,
        usersWithoutSubmissions,
        trendUsers: regularUsers.map((regularUser) => regularUser.mobileNumber),
        trend,
        totals: {
          uniqueSubmissions: new Set(rankingRows.map(uniqueSubmissionKey)).size,
          users: ranking.length,
          usersWithoutSubmissions: usersWithoutSubmissions.length,
        },
      },
    });
  } catch (error) {
    console.error('getSubmissionKpis error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function exportSubmissions(req: Request, res: Response) {
  const { sapCode, mobile, mobileNumber, date, user } = req.query;
  const mobileFilter = (mobile || mobileNumber) as string | undefined;

  try {
    const where: Record<string, unknown> = {};
    if (sapCode) where.sapCode = { contains: String(sapCode) };
    if (mobileFilter) where.mobileNumber = { contains: String(mobileFilter) };
    const submittedAt = parseDateRange(date);
    if (submittedAt) where.submittedAt = submittedAt;
    where.user = user
      ? {
          AND: [
            { mobileNumber: { contains: String(user) } },
            { mobileNumber: { notIn: excludedAnalyticsMobileNumbers() } },
          ],
        }
      : { mobileNumber: { notIn: excludedAnalyticsMobileNumbers() } };

    const submissions = await prisma.submission.findMany({
      where,
      select: {
        id: true,
        sapCode: true,
        mobileNumber: true,
        submittedAt: true,
        user: { select: { mobileNumber: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const header = 'ID,User,SAP Code,VCP Mobile,Submitted At\n';
    const rows = submissions.map(s =>
      [
        s.id,
        s.user?.mobileNumber ?? '',
        s.sapCode,
        s.mobileNumber,
        new Date(s.submittedAt).toISOString(),
      ].join(',')
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="submissions.csv"');
    return res.send(header + rows.join('\n'));
  } catch (error) {
    console.error('exportSubmissions error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
