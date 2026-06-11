import { Request, Response } from 'express';
import prisma from '../prisma/client';

export async function getStates(_req: Request, res: Response) {
  try {
    const states = await prisma.state.findMany({
      select: { id: true, stateName: true, stateCode: true },
      orderBy: { stateName: 'asc' },
    });
    return res.status(200).json({ success: true, data: states });
  } catch (error) {
    console.error('getStates error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getDistrictsByState(req: Request, res: Response) {
  const stateId = String(req.params.stateId || '').trim();
  if (!stateId) {
    return res.status(400).json({ success: false, message: 'State is required' });
  }

  try {
    const state = await prisma.state.findUnique({ where: { id: stateId } });
    if (!state) {
      return res.status(404).json({ success: false, message: 'State not found' });
    }

    const districts = await prisma.district.findMany({
      where: { stateId },
      select: { id: true, districtName: true, districtCode: true, stateId: true },
      orderBy: { districtName: 'asc' },
    });

    return res.status(200).json({ success: true, data: districts });
  } catch (error) {
    console.error('getDistrictsByState error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
