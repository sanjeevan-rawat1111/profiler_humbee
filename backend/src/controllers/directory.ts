import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { sendCsv, sendExcel } from '../utils/exportHelpers';
import {
  fetchFilteredSubmissions,
  parseFilterQuery,
  SubmissionRow,
} from '../utils/submissionFilters';

type DirectoryRow = {
  userId: string;
  userMobileNumber: string;
  region: string;
  sapCode: string;
  mobileNumber: string;
  submissionCount: number;
  firstSubmission: string;
  lastSubmission: string;
};

function aggregateDirectory(rows: SubmissionRow[]): DirectoryRow[] {
  const byUser = new Map<string, {
    userMobileNumber: string;
    region: string;
    submissions: SubmissionRow[];
  }>();

  rows.forEach((row) => {
    if (!row.user) return;
    if (!byUser.has(row.userId)) {
      byUser.set(row.userId, { userMobileNumber: row.user.mobileNumber, region: row.user.region, submissions: [] });
    }
    byUser.get(row.userId)?.submissions.push(row);
  });

  return Array.from(byUser.entries()).map(([userId, data]) => {
    const sorted = [...data.submissions].sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    const latest = sorted[0];
    const first = sorted[sorted.length - 1];
    return {
      userId,
      userMobileNumber: data.userMobileNumber,
      region: data.region,
      sapCode: latest.sapCode,
      mobileNumber: latest.mobileNumber,
      submissionCount: sorted.length,
      firstSubmission: first.submittedAt.toISOString(),
      lastSubmission: latest.submittedAt.toISOString(),
    };
  });
}

function sortDirectory(rows: DirectoryRow[], sortBy: string, sortDir: string) {
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'userMobileNumber':
      case 'username':
        cmp = a.userMobileNumber.localeCompare(b.userMobileNumber);
        break;
      case 'region':
        cmp = a.region.localeCompare(b.region);
        break;
      case 'sapCode':
        cmp = a.sapCode.localeCompare(b.sapCode);
        break;
      case 'mobileNumber':
        cmp = a.mobileNumber.localeCompare(b.mobileNumber);
        break;
      case 'submissionCount':
        cmp = a.submissionCount - b.submissionCount;
        break;
      case 'firstSubmission':
        cmp = new Date(a.firstSubmission).getTime() - new Date(b.firstSubmission).getTime();
        break;
      case 'lastSubmission':
      default:
        cmp = new Date(a.lastSubmission).getTime() - new Date(b.lastSubmission).getTime();
        break;
    }
    return cmp * dir;
  });
}

export async function getSubmissionDirectory(req: Request, res: Response) {
  const filters = parseFilterQuery(req.query);
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
  const sortBy = String(req.query.sortBy || 'lastSubmission');
  const sortDir = String(req.query.sortDir || 'desc');

  try {
    const rows = await fetchFilteredSubmissions(prisma, filters);
    const aggregated = sortDirectory(aggregateDirectory(rows), sortBy, sortDir);
    const total = aggregated.length;
    const start = (page - 1) * limit;

    return res.status(200).json({
      success: true,
      data: {
        records: aggregated.slice(start, start + limit),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('getSubmissionDirectory error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getUserSubmissionDetails(req: Request, res: Response) {
  const { userId } = req.params;
  const filters = parseFilterQuery(req.query);

  try {
    const rows = await fetchFilteredSubmissions(prisma, filters);
    const details = rows
      .filter((row) => row.userId === userId)
      .map((row) => ({
        id: row.id,
        timestamp: row.submittedAt.toISOString(),
        sapCode: row.sapCode,
        mobileNumber: row.mobileNumber,
      }));

    return res.status(200).json({ success: true, data: details });
  } catch (error) {
    console.error('getUserSubmissionDetails error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function exportDirectoryCsv(req: Request, res: Response) {
  try {
    const filters = parseFilterQuery(req.query);
    const sortBy = String(req.query.sortBy || 'lastSubmission');
    const sortDir = String(req.query.sortDir || 'desc');
    const rows = sortDirectory(aggregateDirectory(await fetchFilteredSubmissions(prisma, filters)), sortBy, sortDir);

    return sendCsv(
      res,
      'user-directory.csv',
      ['User Mobile Number', 'Region', 'SAP Code', 'Customer Mobile Number', 'Submission Count', 'First Submission', 'Last Submission'],
      rows.map((r) => [r.userMobileNumber, r.region, r.sapCode, r.mobileNumber, r.submissionCount, r.firstSubmission, r.lastSubmission])
    );
  } catch (error) {
    console.error('exportDirectoryCsv error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function exportDirectoryExcel(req: Request, res: Response) {
  try {
    const filters = parseFilterQuery(req.query);
    const sortBy = String(req.query.sortBy || 'lastSubmission');
    const sortDir = String(req.query.sortDir || 'desc');
    const rows = sortDirectory(aggregateDirectory(await fetchFilteredSubmissions(prisma, filters)), sortBy, sortDir);

    return sendExcel(
      res,
      'user-directory.xls',
      ['User Mobile Number', 'Region', 'SAP Code', 'Customer Mobile Number', 'Submission Count', 'First Submission', 'Last Submission'],
      rows.map((r) => [r.userMobileNumber, r.region, r.sapCode, r.mobileNumber, r.submissionCount, r.firstSubmission, r.lastSubmission])
    );
  } catch (error) {
    console.error('exportDirectoryExcel error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
