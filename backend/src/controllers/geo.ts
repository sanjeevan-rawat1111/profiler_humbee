import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { resolveRegionStateIds } from '../utils/geographyScope';

export async function getRegions(req: AuthenticatedRequest, res: Response) {
  try {
    const scope = req.geographyScope;
    const regions = await prisma.region.findMany({
      where: {
        status: 'active',
        ...(scope && !scope.unrestricted && scope.regionIds.length
          ? { id: { in: scope.regionIds } }
          : scope && !scope.unrestricted
            ? { id: { in: ['__none__'] } }
            : {}),
      },
      select: { id: true, regionName: true, regionCode: true },
      orderBy: { regionName: 'asc' },
    });
    return res.status(200).json({ success: true, data: regions });
  } catch (error) {
    console.error('getRegions error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getStates(req: AuthenticatedRequest, res: Response) {
  const regionId = String(req.query.regionId || '').trim();
  try {
    const scope = req.geographyScope;
    const where: Record<string, unknown> = {};

    if (regionId) {
      const regionStateIds = await resolveRegionStateIds(regionId);
      where.id = { in: regionStateIds.length ? regionStateIds : ['__none__'] };
    }
    if (scope && !scope.unrestricted && scope.stateIds.length) {
      const currentIds = (where.id as { in: string[] } | undefined)?.in;
      where.id = currentIds
        ? { in: currentIds.filter((id) => scope.stateIds.includes(id)) }
        : { in: scope.stateIds };
    } else if (scope && !scope.unrestricted) {
      where.id = { in: ['__none__'] };
    }

    const states = await prisma.state.findMany({
      where,
      select: { id: true, stateName: true, stateCode: true },
      orderBy: { stateName: 'asc' },
    });

    const statesWithRegion = await Promise.all(
      states.map(async (state) => {
        const mapping = await prisma.regionState.findUnique({
          where: { stateId: state.id },
          select: { regionId: true },
        });
        return { ...state, regionId: mapping?.regionId ?? null };
      }),
    );

    return res.status(200).json({ success: true, data: statesWithRegion });
  } catch (error) {
    console.error('getStates error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getDistrictsByState(req: AuthenticatedRequest, res: Response) {
  const stateId = String(req.params.stateId || '').trim();
  if (!stateId) {
    return res.status(400).json({ success: false, message: 'State is required' });
  }

  try {
    const scope = req.geographyScope;
    const state = await prisma.state.findUnique({ where: { id: stateId } });
    if (!state) {
      return res.status(404).json({ success: false, message: 'State not found' });
    }

    const where: Record<string, unknown> = { stateId };
    if (scope && !scope.unrestricted && scope.districtIds.length) {
      where.id = { in: scope.districtIds };
    } else if (scope && !scope.unrestricted) {
      where.id = { in: ['__none__'] };
    }

    const districts = await prisma.district.findMany({
      where,
      select: { id: true, districtName: true, districtCode: true, stateId: true },
      orderBy: { districtName: 'asc' },
    });

    return res.status(200).json({ success: true, data: districts });
  } catch (error) {
    console.error('getDistrictsByState error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
