import { readFileSync } from 'fs';
import { join } from 'path';
import prisma from '../prisma/client';

type CsvRow = {
  stateName: string;
  stateCode: string;
  districtName: string;
  districtCode: string;
};

function formatGeoName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/(^|[\s&]+)([a-z])/g, (_, sep, char) => `${sep}${char.toUpperCase()}`);
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const stateNameIdx = header.indexOf('state_name');
  const stateIdIdx = header.indexOf('state_id');
  const districtNameIdx = header.indexOf('district_name');
  const districtIdIdx = header.indexOf('district_id');

  if ([stateNameIdx, stateIdIdx, districtNameIdx, districtIdIdx].some((idx) => idx < 0)) {
    throw new Error('CSV must contain state_name, state_id, district_name, district_id columns');
  }

  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const rawState = cols[stateNameIdx]?.trim() ?? '';
    const rawDistrict = cols[districtNameIdx]?.trim() ?? '';
    return {
      stateName: formatGeoName(rawState),
      stateCode: cols[stateIdIdx]?.trim() ?? '',
      districtName: formatGeoName(rawDistrict),
      districtCode: cols[districtIdIdx]?.trim() ?? '',
    };
  }).filter((row) => row.stateCode && row.districtCode && row.stateName && row.districtName);
}

function loadHumbeeGeoCsv(): CsvRow[] {
  const candidates = [
    join(__dirname, 'humbeeGeography.csv'),
    join(process.cwd(), 'src/data/humbeeGeography.csv'),
  ];
  for (const filePath of candidates) {
    try {
      return parseCsv(readFileSync(filePath, 'utf8'));
    } catch {
      // try next path
    }
  }
  throw new Error('HUMBEE geography CSV not found at backend/src/data/humbeeGeography.csv');
}

async function clearGeoMaster() {
  await prisma.user.updateMany({ data: { stateId: null, districtId: null } });
  await prisma.district.deleteMany();
  await prisma.state.deleteMany();
}

export async function seedGeoMaster() {
  const rows = loadHumbeeGeoCsv();

  const stateEntries = new Map<string, { stateName: string; stateCode: string }>();
  rows.forEach((row) => {
    if (!stateEntries.has(row.stateCode)) {
      stateEntries.set(row.stateCode, { stateName: row.stateName, stateCode: row.stateCode });
    }
  });

  await clearGeoMaster();

  await prisma.state.createMany({
    data: [...stateEntries.values()].map((state) => ({
      stateName: state.stateName,
      stateCode: state.stateCode,
    })),
  });

  const states = await prisma.state.findMany({
    select: { id: true, stateCode: true },
  });
  const stateIdByCode = new Map(states.map((state) => [state.stateCode, state.id]));

  const districtRows = rows.map((row) => {
    const stateId = stateIdByCode.get(row.stateCode);
    if (!stateId) {
      throw new Error(`Missing state for code ${row.stateCode}`);
    }
    return {
      districtName: row.districtName,
      districtCode: row.districtCode,
      stateId,
    };
  });

  await prisma.district.createMany({ data: districtRows });

  return {
    stateCount: stateEntries.size,
    districtCount: districtRows.length,
  };
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
    where: { stateName: { equals: formatGeoName(stateName), mode: 'insensitive' } },
  });
  if (!state) return null;

  const district = await prisma.district.findFirst({
    where: {
      stateId: state.id,
      districtName: { equals: formatGeoName(districtName), mode: 'insensitive' },
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
    select: { id: true, state: true, district: true, stateId: true, districtId: true },
  });

  const fallback = await findGeoByNames('Delhi', 'Central Delhi');
  if (!fallback) return 0;

  let updated = 0;
  for (const user of users) {
    const resolved = user.state && user.district
      ? await findGeoByNames(user.state, user.district)
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
