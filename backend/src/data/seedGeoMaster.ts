import prisma from '../prisma/client';
import {
  findGeoByNames,
  getGeoStats,
  initStaticGeography,
  resolveGeoIds,
} from './staticGeography';

export { findGeoByNames, resolveGeoIds };

export async function seedGeoMaster() {
  initStaticGeography();
  return getGeoStats();
}

export async function backfillUserGeoFromText() {
  initStaticGeography();

  const users = await prisma.user.findMany({
    select: { id: true, state: true, district: true, stateId: true, districtId: true },
  });

  const fallback = findGeoByNames('Delhi', 'Central Delhi');
  if (!fallback) return 0;

  let updated = 0;
  for (const user of users) {
    const resolved = user.state && user.district
      ? findGeoByNames(user.state, user.district)
      : null;

    const geo = resolved ?? fallback;
    if (user.stateId === geo.stateId && user.districtId === geo.districtId
      && user.state === geo.stateName && user.district === geo.districtName) {
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        stateId: geo.stateId,
        districtId: geo.districtId,
        state: geo.stateName,
        district: geo.districtName,
        region: geo.stateName,
      },
    });
    updated += 1;
  }
  return updated;
}
