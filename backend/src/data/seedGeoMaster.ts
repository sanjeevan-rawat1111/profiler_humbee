import { readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import prisma from '../prisma/client';

type GeoJson = {
  states: { state: string; stateCode: string; districts: string[] }[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function districtCode(stateCode: string, districtName: string) {
  return `${stateCode}-${slugify(districtName)}`.slice(0, 64);
}

function loadGeoJson(): GeoJson {
  const candidates = [
    join(__dirname, 'indianStatesDistricts.json'),
    join(process.cwd(), 'src/data/indianStatesDistricts.json'),
  ];
  for (const filePath of candidates) {
    try {
      return JSON.parse(readFileSync(filePath, 'utf8')) as GeoJson;
    } catch {
      // try next path
    }
  }
  throw new Error('Indian geo master JSON file not found');
}

export async function seedGeoMaster() {
  const existingStates = await prisma.state.count();
  if (existingStates > 0) {
    return {
      stateCount: existingStates,
      districtCount: await prisma.district.count(),
    };
  }

  const data = loadGeoJson();
  const stateRows = data.states.map((entry) => ({
    id: randomUUID(),
    stateName: entry.state,
    stateCode: entry.stateCode,
  }));

  const stateIdByCode = new Map(stateRows.map((row) => [row.stateCode, row.id]));
  const districtRows = data.states.flatMap((entry) =>
    entry.districts.map((districtName) => ({
      id: randomUUID(),
      districtName,
      districtCode: districtCode(entry.stateCode, districtName),
      stateId: stateIdByCode.get(entry.stateCode)!,
    })),
  );

  await prisma.$transaction([
    prisma.state.createMany({ data: stateRows }),
    prisma.district.createMany({ data: districtRows }),
  ]);

  return { stateCount: stateRows.length, districtCount: districtRows.length };
}

export async function resolveGeoIds(stateId: string, districtId: string) {
  const district = await prisma.district.findUnique({
    where: { id: districtId },
    include: { state: true },
  });
  if (!district || district.stateId !== stateId) {
    return null;
  }
  return {
    stateId: district.stateId,
    districtId: district.id,
    stateName: district.state.stateName,
    districtName: district.districtName,
  };
}

export async function findGeoByNames(stateName: string, districtName: string) {
  const state = await prisma.state.findFirst({
    where: { stateName: { equals: stateName, mode: 'insensitive' } },
  });
  if (!state) return null;

  const district = await prisma.district.findFirst({
    where: {
      stateId: state.id,
      districtName: { equals: districtName, mode: 'insensitive' },
    },
  });
  if (!district) return null;

  return {
    stateId: state.id,
    districtId: district.id,
    stateName: state.stateName,
    districtName: district.districtName,
  };
}

export async function backfillUserGeoFromText() {
  const users = await prisma.user.findMany({
    where: { OR: [{ stateId: null }, { districtId: null }] },
    select: { id: true, state: true, district: true },
  });

  const fallback = await findGeoByNames('Delhi', 'New Delhi');
  if (!fallback) return 0;

  let updated = 0;
  for (const user of users) {
    const resolved = user.state && user.district
      ? await findGeoByNames(user.state, user.district)
      : null;

    const geo = resolved ?? fallback;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stateId: geo.stateId,
        districtId: geo.districtId,
        region: geo.stateName,
      },
    });
    updated += 1;
  }
  return updated;
}
