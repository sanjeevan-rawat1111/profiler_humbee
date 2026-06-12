import { readFileSync } from 'fs';
import { join } from 'path';

export type StaticState = {
  id: string;
  stateName: string;
  stateCode: string;
};

export type StaticDistrict = {
  id: string;
  districtName: string;
  districtCode: string;
  stateId: string;
};

type CsvRow = {
  stateName: string;
  stateId: string;
  districtName: string;
  districtId: string;
};

let states: StaticState[] = [];
let districts: StaticDistrict[] = [];
const districtsByState = new Map<string, StaticDistrict[]>();
const stateById = new Map<string, StaticState>();
const districtById = new Map<string, StaticDistrict>();
let loaded = false;

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
    return {
      stateName: formatGeoName(cols[stateNameIdx]?.trim() ?? ''),
      stateId: cols[stateIdIdx]?.trim() ?? '',
      districtName: formatGeoName(cols[districtNameIdx]?.trim() ?? ''),
      districtId: cols[districtIdIdx]?.trim() ?? '',
    };
  }).filter((row) => row.stateId && row.districtId && row.stateName && row.districtName);
}

function loadCsvFile(): CsvRow[] {
  const candidates = [
    join(__dirname, 'humbeeGeography.csv'),
    join(process.cwd(), 'src/data/humbeeGeography.csv'),
    join(process.cwd(), 'dist/data/humbeeGeography.csv'),
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

export function initStaticGeography() {
  if (loaded) return;

  const rows = loadCsvFile();
  const stateMap = new Map<string, StaticState>();

  rows.forEach((row) => {
    if (!stateMap.has(row.stateId)) {
      stateMap.set(row.stateId, {
        id: row.stateId,
        stateName: row.stateName,
        stateCode: row.stateId,
      });
    }
  });

  states = [...stateMap.values()].sort((a, b) => a.stateName.localeCompare(b.stateName));
  stateById.clear();
  states.forEach((state) => stateById.set(state.id, state));

  districts = rows.map((row) => ({
    id: row.districtId,
    districtName: row.districtName,
    districtCode: row.districtId,
    stateId: row.stateId,
  })).sort((a, b) => a.districtName.localeCompare(b.districtName));

  districtById.clear();
  districtsByState.clear();
  districts.forEach((district) => {
    districtById.set(district.id, district);
    const bucket = districtsByState.get(district.stateId) ?? [];
    bucket.push(district);
    districtsByState.set(district.stateId, bucket);
  });

  loaded = true;
  console.log(`Static geography loaded: ${states.length} states, ${districts.length} districts`);
}

export function getAllStates(): StaticState[] {
  initStaticGeography();
  return states;
}

export function getAllDistricts(): StaticDistrict[] {
  initStaticGeography();
  return districts;
}

export function getStateById(stateId: string): StaticState | undefined {
  initStaticGeography();
  return stateById.get(String(stateId).trim());
}

export function getDistrictById(districtId: string): StaticDistrict | undefined {
  initStaticGeography();
  return districtById.get(String(districtId).trim());
}

export function getDistrictsByStateId(stateId: string): StaticDistrict[] {
  initStaticGeography();
  return districtsByState.get(String(stateId).trim()) ?? [];
}

export function getDistrictIdsForStateIds(stateIds: string[]): string[] {
  initStaticGeography();
  return stateIds.flatMap((stateId) => (districtsByState.get(stateId) ?? []).map((d) => d.id));
}

export function isValidStateId(stateId: string): boolean {
  return !!getStateById(stateId);
}

export function isValidDistrictId(districtId: string): boolean {
  return !!getDistrictById(districtId);
}

export function filterStates(options: {
  ids?: string[];
  regionStateIds?: string[];
} = {}): StaticState[] {
  let result = getAllStates();
  if (options.regionStateIds?.length) {
    const allowed = new Set(options.regionStateIds);
    result = result.filter((state) => allowed.has(state.id));
  }
  if (options.ids?.length) {
    const allowed = new Set(options.ids);
    result = result.filter((state) => allowed.has(state.id));
  }
  return result;
}

export function filterDistricts(options: {
  stateId?: string;
  ids?: string[];
} = {}): StaticDistrict[] {
  let result = options.stateId ? getDistrictsByStateId(options.stateId) : getAllDistricts();
  if (options.ids?.length) {
    const allowed = new Set(options.ids);
    result = result.filter((district) => allowed.has(district.id));
  }
  return result;
}

export function resolveGeoIds(stateId: string, districtId: string) {
  const district = getDistrictById(districtId);
  const normalizedStateId = String(stateId).trim();
  if (!district || district.stateId !== normalizedStateId) {
    return null;
  }
  const state = getStateById(normalizedStateId);
  if (!state) return null;
  return {
    stateId: state.id,
    districtId: district.id,
    stateName: state.stateName,
    districtName: district.districtName,
  };
}

export function findGeoByNames(stateName: string, districtName: string) {
  const normalizedState = formatGeoName(stateName);
  const normalizedDistrict = formatGeoName(districtName);
  const state = getAllStates().find((entry) => entry.stateName.toLowerCase() === normalizedState.toLowerCase());
  if (!state) return null;

  const district = getDistrictsByStateId(state.id).find(
    (entry) => entry.districtName.toLowerCase() === normalizedDistrict.toLowerCase(),
  );
  if (!district) return null;

  return {
    stateId: state.id,
    districtId: district.id,
    stateName: state.stateName,
    districtName: district.districtName,
  };
}

export function getGeoStats() {
  initStaticGeography();
  return { stateCount: states.length, districtCount: districts.length };
}
