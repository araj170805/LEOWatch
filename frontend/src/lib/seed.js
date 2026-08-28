// Small curated set used for default conjunction screening and the 3D
// object selector. The full tracking catalog comes from GET /catalog.
export const SEED_CATALOG = [
  { noradId: 25544, name: 'ISS (ZARYA)' },
  { noradId: 43013, name: 'NOAA 20' },
  { noradId: 48274, name: 'STARLINK-3012' },
  { noradId: 44714, name: 'STARLINK-1130' },
  { noradId: 37820, name: 'SL-16 R/B' },
  { noradId: 22675, name: 'COSMOS 2251 DEB' },
  { noradId: 28654, name: 'IRIDIUM 33 DEB' },
];

export const SEED_IDS = SEED_CATALOG.map((o) => o.noradId);
