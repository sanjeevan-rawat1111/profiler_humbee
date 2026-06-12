import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  filterDistricts,
  filterStates,
  getStateById,
} from '../data/staticGeography';
import { resolveRegionStateIds } from '../utils/geographyScope';

async function loadStateRegionIdMap(): Promise<Map<string, string | null>> {
  const mappings = await prisma.regionState.findMany({
    select: { stateId: true, regionId: true },
  });
  return new Map(mappings.map((mapping) => [mapping.stateId, mapping.regionId]));
}

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
    const regionStateIds = regionId ? await resolveRegionStateIds(regionId) : undefined;

    let states = filterStates({
      regionStateIds: regionStateIds?.length ? regionStateIds : regionId ? ['__none__'] : undefined,
    });

    if (scope && !scope.unrestricted && scope.stateIds.length) {
      states = states.filter((state) => scope.stateIds.includes(state.id));
    } else if (scope && !scope.unrestricted) {
      states = [];
    }

    const regionMap = await loadStateRegionIdMap();
    const statesWithRegion = states.map((state) => ({
      ...state,
      regionId: regionMap.get(state.id) ?? null,
    }));

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
    if (!getStateById(stateId)) {
      return res.status(404).json({ success: false, message: 'State not found' });
    }

    let districts = filterDistricts({ stateId });
    if (scope && !scope.unrestricted && scope.districtIds.length) {
      districts = districts.filter((district) => scope.districtIds.includes(district.id));
    } else if (scope && !scope.unrestricted) {
      districts = [];
    }

    return res.status(200).json({ success: true, data: districts });
  } catch (error) {
    console.error('getDistrictsByState error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
