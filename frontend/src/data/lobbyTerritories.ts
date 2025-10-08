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
