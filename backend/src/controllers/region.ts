import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const regionSelect = {
  id: true,
  regionName: true,
  regionCode: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  regionStates: {
    select: {
      state: {
        select: { id: true, stateName: true, stateCode: true },
      },
    },
  },
} as const;

function mapRegion(region: {
  id: string;
  regionName: string;
  regionCode: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  regionStates: { state: { id: string; stateName: string; stateCode: string } }[];
}) {
  return {
    id: region.id,
    regionName: region.regionName,
    regionCode: region.regionCode,
    status: region.status,
    createdAt: region.createdAt.toISOString(),
    updatedAt: region.updatedAt.toISOString(),
    stateCount: region.regionStates.length,
    states: region.regionStates
      .map((entry) => entry.state)
      .sort((a, b) => a.stateName.localeCompare(b.stateName)),
  };
}

async function syncRegionStates(regionId: string, stateIds: string[]) {
  await prisma.regionState.deleteMany({ where: { regionId } });
  if (!stateIds.length) return;

  await prisma.regionState.createMany({
    data: stateIds.map((stateId) => ({ regionId, stateId })),
  });
}

export async function getRegions(_req: AuthenticatedRequest, res: Response) {
  try {
    const regions = await prisma.region.findMany({
      select: regionSelect,
      orderBy: { regionName: 'asc' },
    });
    return res.status(200).json({ success: true, data: regions.map(mapRegion) });
  } catch (error) {
    console.error('getRegions error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function createRegion(req: AuthenticatedRequest, res: Response) {
  const regionName = String(req.body.regionName || '').trim();
  const status = String(req.body.status || 'active').trim() === 'inactive' ? 'inactive' : 'active';
  const stateIds = Array.isArray(req.body.stateIds)
    ? [...new Set(req.body.stateIds.map((value: unknown) => String(value).trim()).filter(Boolean))] as string[]
    : [];

  if (!regionName) {
    return res.status(400).json({ success: false, message: 'Region name is required' });
  }

  try {
    const existing = await prisma.region.findUnique({ where: { regionName } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Region already exists' });
    }

    const region = await prisma.region.create({
      data: { regionName, status },
      select: regionSelect,
    });

    if (stateIds.length) {
      await syncRegionStates(region.id, stateIds);
      const refreshed = await prisma.region.findUnique({ where: { id: region.id }, select: regionSelect });
      return res.status(201).json({ success: true, data: mapRegion(refreshed!) });
    }

    return res.status(201).json({ success: true, data: mapRegion(region) });
  } catch (error) {
    console.error('createRegion error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function updateRegion(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const regionName = req.body.regionName !== undefined ? String(req.body.regionName).trim() : undefined;
  const status = req.body.status !== undefined
    ? (String(req.body.status).trim() === 'inactive' ? 'inactive' : 'active')
    : undefined;
  const stateIds = Array.isArray(req.body.stateIds)
    ? [...new Set(req.body.stateIds.map((value: unknown) => String(value).trim()).filter(Boolean))] as string[]
    : undefined;

  try {
    const existing = await prisma.region.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Region not found' });
    }

    if (regionName && regionName !== existing.regionName) {
      const dup = await prisma.region.findUnique({ where: { regionName } });
      if (dup) {
        return res.status(400).json({ success: false, message: 'Region name already exists' });
      }
    }

    await prisma.region.update({
      where: { id },
      data: {
        ...(regionName ? { regionName } : {}),
        ...(status ? { status } : {}),
      },
    });

    if (stateIds !== undefined) {
      if (stateIds.length) {
        await prisma.regionState.deleteMany({
          where: { stateId: { in: stateIds }, regionId: { not: id } },
        });
      }
      await syncRegionStates(id, stateIds);
    }

    const region = await prisma.region.findUnique({ where: { id }, select: regionSelect });
    return res.status(200).json({ success: true, data: mapRegion(region!) });
  } catch (error) {
    console.error('updateRegion error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteRegion(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    const existing = await prisma.region.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Region not found' });
    }

    await prisma.region.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Region deleted' });
  } catch (error) {
    console.error('deleteRegion error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
