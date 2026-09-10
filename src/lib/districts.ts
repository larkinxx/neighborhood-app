import fs from 'node:fs'
import path from 'node:path'
import { booleanPointInPolygon, point } from '@turf/turf'
import type { Feature, MultiPolygon, Polygon } from 'geojson'

type DistrictFeature = Feature<Polygon | MultiPolygon, { name: string }> & { id: string }
type DistrictsGeoJSON = { type: 'FeatureCollection'; features: DistrictFeature[] }

let cachedDistricts: DistrictsGeoJSON | null = null

function loadDistricts(): DistrictsGeoJSON {
  if (!cachedDistricts) {
    const filePath = path.join(process.cwd(), 'public', 'moscow-districts.geojson')
    cachedDistricts = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as DistrictsGeoJSON
  }
  return cachedDistricts
}

// Определяет район Москвы по точке (point-in-polygon), сопоставляя с
// public/moscow-districts.geojson. Возвращает osm_id (внешний ключ к
// public.districts.osm_id) или null, если точка не попала ни в один
// полигон (например, за пределами Москвы или на упрощённой границе).
export function findDistrictOsmId(lat: number, lng: number): string | null {
  const { features } = loadDistricts()
  // turf ожидает координаты в порядке [lng, lat]
  const pt = point([lng, lat])

  const match = features.find((feature) => booleanPointInPolygon(pt, feature))
  return match?.id ?? null
}
