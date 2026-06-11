import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const HUMBEE_API_KEY = process.env.HUMBEE_API_KEY || '08d878bb-c592-4083-9fdc-149d52470395';
const HUMBEE_API_URL = process.env.HUMBEE_API_URL || 'https://api-dev.humbee.in/external-system/generate-pwa-module-access';

// Flexible recursive URL finder
function findPwaUrl(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === 'string') {
    return data.startsWith('http://') || data.startsWith('https://') ? data : null;
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      const url = findPwaUrl(item);
      if (url) return url;
    }
  }
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const preferredKeys = ['pwaUrl', 'pwaurl', 'url', 'pwaAccessUrl', 'pwaLink', 'link', 'moduleUrl', 'accessUrl', 'href', 'data'];
    for (const key of preferredKeys) {
      const val = obj[key];
      if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) {
        return val;
      }
    }
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const result = findPwaUrl(obj[key]);
        if (result) return result;
      }
    }
  }
  return null;
}

export async function createSubmission(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (req.user.role !== 'user') {
    return res.status(403).json({
      success: false,
      message: 'Only salesperson accounts can create submission logs.',
    });
  }

  const { sapCode, mobileNumber } = req.body;

  try {
    const response = await fetch(HUMBEE_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': HUMBEE_API_KEY,
        'customer-code': sapCode,
        'customer-phone-number': mobileNumber,
        'Content-Type': 'application/json',
        'sfa': 'true'
      },
      body: JSON.stringify({}),
    });

    const responseText = await response.text();
    let responseData: unknown;
    try { responseData = JSON.parse(responseText); } catch { responseData = { rawText: responseText }; }

    if (response.status < 200 || response.status >= 300) {
      return res.status(response.status).json({
        success: false,
        message: 'Humbee external API error',
        data: responseData,
      });
    }

    const pwaUrl = findPwaUrl(responseData);
    if (!pwaUrl) {
      return res.status(502).json({
        success: false,
        message: 'User not found',
        data: responseData,
      });
    }

    const submission = await prisma.submission.create({
      data: {
        userId: req.user.userId,
        sapCode,
        mobileNumber,
        pwaUrl,
        apiResponse: JSON.stringify(responseData),
      },
    });

    return res.status(201).json({
      success: true,
      data: { submissionId: submission.id, pwaUrl },
    });
  } catch (error) {
    console.error('Submission error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
