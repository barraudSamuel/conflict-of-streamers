import geoJsonData from './custom.geo.json'
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson'

type LobbyGeometry = Polygon | MultiPolygon
export interface LobbyTerritoryProperties {
  id: string
  name: string
}
export type LobbyTerritoryFeature = Feature<LobbyGeometry, LobbyTerritoryProperties>
export type LobbyTerritoryCollection = FeatureCollection<LobbyGeometry, LobbyTerritoryProperties>

const rawCollection = geoJsonData as FeatureCollection<Geometry>

const NAME_TO_ISO: Record<string, string> = {
  France: 'FR',
  Germany: 'DE',
  Spain: 'ES',
  Italy: 'IT',
  'United Kingdom': 'GB',
  Poland: 'PL',
  Russia: 'RU',
  'Russian Federation': 'RU',
  'United States of America': 'US',
  Canada: 'CA',
  Mexico: 'MX',
  Brazil: 'BR',
  Argentina: 'AR',
  China: 'CN',
  India: 'IN',
  Australia: 'AU',
  Japan: 'JP',
  Egypt: 'EG',
  'South Africa': 'ZA',
  Nigeria: 'NG',
  Turkey: 'TR',
  Ukraine: 'UA'
}

const normalizeFeature = (
  feature: Feature<Geometry, Record<string, unknown>>
): LobbyTerritoryFeature | null => {
  if (!feature.properties || !feature.geometry) return null

  const geometry = feature.geometry
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
    return null
  }

  const props = feature.properties

  const isoCandidates = [
    props.ISO_A2,
    props.ISO_A2_EH,
    props.ISO2,
    props.iso_a2,
    props.iso_a2_eh,
    props['Alpha-2'],
    props.alpha2,
    props['ISO3166-1-Alpha-2'],
    props.ISO31661Alpha2,
    props.iso31661Alpha2,
    props.CODE,
    props.code,
    props.id
  ]

  let code: string | null = null
  for (const candidate of isoCandidates) {
    if (typeof candidate === 'string') {
      const normalized = candidate.trim().toUpperCase()
      if (normalized.length === 2 && normalized !== 'NA' && normalized !== '-99') {
        code = normalized
        break
      }
    }
  }

  const name =
    (typeof props.name === 'string' && props.name.trim().length > 0 ? props.name.trim() : code) ??
    'Unknown'

  if (!code && NAME_TO_ISO[name]) {
    code = NAME_TO_ISO[name]
  }

  return {
    type: 'Feature',
    geometry,
    properties: {
      id: code ?? name,
      name
    }
  }
}

const features: LobbyTerritoryFeature[] = rawCollection.features
  .map((feature) => normalizeFeature(feature as Feature<Geometry, Record<string, unknown>>))
  .filter((feature): feature is LobbyTerritoryFeature => feature !== null)

export const lobbyTerritories: LobbyTerritoryCollection = {
  type: 'FeatureCollection',
  features
}
