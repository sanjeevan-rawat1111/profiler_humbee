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
  const byCombo = new Map<string, {
    userId: string;
    userMobileNumber: string;
    region: string;
    sapCode: string;
    mobileNumber: string;
    submissions: SubmissionRow[];
  }>();

  rows.forEach((row) => {
    if (!row.user) return;
    const key = `${row.userId}\0${row.sapCode}\0${row.mobileNumber}`;
    if (!byCombo.has(key)) {
      byCombo.set(key, {
        userId: row.userId,
        userMobileNumber: row.user.mobileNumber,
        region: row.user.region,
        sapCode: row.sapCode,
        mobileNumber: row.mobileNumber,
        submissions: [],
      });
    }
    byCombo.get(key)?.submissions.push(row);
  });

  return Array.from(byCombo.values()).map((data) => {
    const sorted = [...data.submissions].sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    const first = sorted[sorted.length - 1];
    const latest = sorted[0];
    return {
      userId: data.userId,
      userMobileNumber: data.userMobileNumber,
      region: data.region,
      sapCode: data.sapCode,
      mobileNumber: data.mobileNumber,
      submissionCount: sorted.length,
      firstSubmission: first.submittedAt.toISOString(),
      lastSubmission: latest.submittedAt.toISOString(),
    };
  });
}

type MasterRow = {
  userMobileNumber: string;
  region: string;
  sapCode: string;
  mobileNumber: string;
  timestamp: string;
};

function buildMasterRows(rows: SubmissionRow[]): MasterRow[] {
  return rows
    .filter((row) => row.user)
    .map((row) => ({
      userMobileNumber: row.user!.mobileNumber,
      region: row.user!.region,
      sapCode: row.sapCode,
      mobileNumber: row.mobileNumber,
      timestamp: row.submittedAt.toISOString(),
    }));
}

function sortMasterRows(rows: MasterRow[], sortBy: string, sortDir: string) {
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
      case 'firstSubmission':
      case 'lastSubmission':
      default:
        cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        break;
    }
    return cmp * dir;
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
  const groupSapCode = String(req.query.groupSapCode || '');
  const groupVcpMobile = String(req.query.groupVcpMobile || '');
  const filters = parseFilterQuery(req.query);

  try {
    const rows = await fetchFilteredSubmissions(prisma, filters);
    const details = rows
      .filter((row) =>
        row.userId === userId
        && row.sapCode === groupSapCode
        && row.mobileNumber === groupVcpMobile
      )
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
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
    const downloadMode = String(req.query.downloadMode || 'normal');
    const submissions = await fetchFilteredSubmissions(prisma, filters);

    if (downloadMode === 'master') {
      const rows = sortMasterRows(buildMasterRows(submissions), sortBy, sortDir);
      return sendCsv(
        res,
        'user-directory.csv',
        ['User', 'Region', 'SAP Code', 'VCP Mobile', 'Timestamp'],
        rows.map((r) => [r.userMobileNumber, r.region, r.sapCode, r.mobileNumber, r.timestamp])
      );
    }

    const rows = sortDirectory(aggregateDirectory(submissions), sortBy, sortDir);
    return sendCsv(
      res,
      'user-directory.csv',
      ['User', 'Region', 'SAP Code', 'VCP Mobile', 'Submission Count', 'First Submission', 'Last Submission'],
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
    const downloadMode = String(req.query.downloadMode || 'normal');
    const submissions = await fetchFilteredSubmissions(prisma, filters);

    if (downloadMode === 'master') {
      const rows = sortMasterRows(buildMasterRows(submissions), sortBy, sortDir);
      return sendExcel(
        res,
        'user-directory.xls',
        ['User', 'Region', 'SAP Code', 'VCP Mobile', 'Timestamp'],
        rows.map((r) => [r.userMobileNumber, r.region, r.sapCode, r.mobileNumber, r.timestamp])
      );
    }

    const rows = sortDirectory(aggregateDirectory(submissions), sortBy, sortDir);
    return sendExcel(
      res,
      'user-directory.xls',
      ['User', 'Region', 'SAP Code', 'VCP Mobile', 'Submission Count', 'First Submission', 'Last Submission'],
      rows.map((r) => [r.userMobileNumber, r.region, r.sapCode, r.mobileNumber, r.submissionCount, r.firstSubmission, r.lastSubmission])
    );
  } catch (error) {
    console.error('exportDirectoryExcel error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
