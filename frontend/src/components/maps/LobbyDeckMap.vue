<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Deck } from '@deck.gl/core'
import type { PickingInfo } from '@deck.gl/core'
import { GeoJsonLayer, TextLayer } from '@deck.gl/layers'
import {
  lobbyTerritories,
  type LobbyTerritoryCollection,
  type LobbyTerritoryFeature
} from '@/data/lobbyTerritories'

interface LobbyTerritory {
  id: string
  ownerId?: string | null
  defensePower?: number | null
  code?: string | null
  name?: string | null
}

interface LobbyPlayer {
  id: string
  twitchUsername?: string | null
  color?: string | null
}

interface ActiveAttack {
  id?: string | null
  territoryId?: string | null
  fromTerritory?: string | null
  toTerritory?: string | null
}

interface ActiveReinforcement {
  id?: string | null
  territoryId?: string | null
  territoryName?: string | null
  initiatorId?: string | null
}

const props = defineProps<{
  territories: LobbyTerritory[]
  players: LobbyPlayer[]
  currentPlayerId: string
  disableInteraction?: boolean
  appearance?: 'lobby' | 'game'
  activeAttacks?: ActiveAttack[]
  activeReinforcements?: ActiveReinforcement[]
}>()

const emit = defineEmits<{
  (event: 'select', territoryId: string): void
}>()

const initialViewState = {
  longitude: 15,
  latitude: 15,
  zoom: 1.3,
  minZoom: 0.6,
  maxZoom: 5,
  bearing: 0,
  pitch: 0
}

const containerRef = ref<HTMLDivElement | null>(null)
let deckInstance: Deck | null = null
const mapAppearance = computed(() => props.appearance ?? 'lobby')
const containerClass = computed(() => ({
  'lobby-map-canvas': true,
  'lobby-map-canvas--game': mapAppearance.value === 'game'
}))
const showDefenseOverlay = computed(() => mapAppearance.value === 'game')
const showAttackOverlay = computed(() => mapAppearance.value === 'game')
const viewZoom = ref(initialViewState.zoom)

const DEFAULT_AVAILABLE_COLOR: [number, number, number, number] = [71, 85, 105, 130]
const DEFAULT_OCCUPIED_COLOR: [number, number, number, number] = [148, 163, 184, 210]
const DEFAULT_BORDER_COLOR: [number, number, number, number] = [30, 41, 59, 220]
const CURRENT_PLAYER_BORDER_COLOR: [number, number, number, number] = [226, 232, 240, 255]
const CURRENT_PLAYER_FALLBACK_COLOR: [number, number, number, number] = [34, 197, 94, 220]
const BOT_OWNER_PREFIX = 'bot:'
const BOT_OWNER_COLOR = '#64748b'
const BOT_HIGHLIGHT_COLOR: [number, number, number, number] = [100, 116, 139, 210]
const ATTACK_ARROW_COLOR: [number, number, number, number] = [239, 68, 68, 235]
const ATTACK_ARROW_SIZE_MIN = 14
const ATTACK_ARROW_SIZE_MAX = 30
const BORDER_DISTANCE_EPSILON = 1e-6

interface DefenseLabelDatum {
  position: [number, number]
  defense: number
  isCurrent: boolean
  isBot: boolean
}

interface AttackArrowDatum {
  id: string
  position: [number, number]
  angle: number
}

type Coordinate2D = [number, number]

const toCoordinate2D = (value: unknown): Coordinate2D | null => {
  if (!Array.isArray(value) || value.length < 2) {
    return null
  }
  const [lon, lat] = value
  if (typeof lon !== 'number' || typeof lat !== 'number' || Number.isNaN(lon) || Number.isNaN(lat)) {
    return null
  }
  return [lon, lat]
}

const collectBoundaryPoints = (feature: LobbyTerritoryFeature): Coordinate2D[] => {
  const geometry = feature.geometry
  const points: Coordinate2D[] = []

  const pushRing = (ring: number[][]) => {
    ring.forEach((coordinate) => {
      if (!Array.isArray(coordinate)) {
        return
      }
      const [lon, lat] = coordinate
      if (typeof lon !== 'number' || typeof lat !== 'number') {
        return
      }
      if (Number.isFinite(lon) && Number.isFinite(lat)) {
        points.push([lon, lat])
      }
    })
  }

  if (geometry.type === 'Polygon') {
    const outer = geometry.coordinates[0]
    if (Array.isArray(outer)) {
      pushRing(outer as number[][])
    }
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((polygon) => {
      const outer = polygon[0]
      if (Array.isArray(outer)) {
        pushRing(outer as number[][])
      }
    })
  }

  return points
}

const toVector = (from: Coordinate2D | null, to: Coordinate2D | null): { direction: Coordinate2D; length: number } => {
  if (!from || !to) {
    return { direction: [0, 0], length: 0 }
  }

  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) {
    return { direction: [0, 0], length: 0 }
  }

  return { direction: [dx / length, dy / length], length }
}

interface BoundarySegment {
  start: Coordinate2D
  end: Coordinate2D
  length: number
  direction: Coordinate2D
  canonicalKey: string
}

const featureSegmentCache = new WeakMap<LobbyTerritoryFeature, BoundarySegment[]>()

const formatCoordinate = ([lon, lat]: Coordinate2D) => `${lon.toFixed(5)},${lat.toFixed(5)}`

const createSegmentKey = (a: Coordinate2D, b: Coordinate2D) => {
  const keyA = formatCoordinate(a)
  const keyB = formatCoordinate(b)
  return keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`
}

const getFeatureSegments = (feature: LobbyTerritoryFeature): BoundarySegment[] => {
  const cached = featureSegmentCache.get(feature)
  if (cached) return cached

  const segments: BoundarySegment[] = []
  const geometry = feature.geometry

  const pushRingSegments = (ring: number[][]) => {
    if (!Array.isArray(ring) || ring.length < 2) return
    for (let i = 0; i < ring.length; i += 1) {
      const current = ring[i]
      const next = ring[(i + 1) % ring.length]
      if (!Array.isArray(current) || !Array.isArray(next) || current.length < 2 || next.length < 2) {
        continue
      }
      const start: Coordinate2D = [Number(current[0]), Number(current[1])]
      const end: Coordinate2D = [Number(next[0]), Number(next[1])]
      const dx = end[0] - start[0]
      const dy = end[1] - start[1]
      const length = Math.sqrt(dx * dx + dy * dy)
      if (!Number.isFinite(length) || length <= Number.EPSILON) {
        continue
      }
      const inv = 1 / length
      segments.push({
        start,
        end,
        length,
        direction: [dx * inv, dy * inv],
        canonicalKey: createSegmentKey(start, end)
      })
    }
  }

  if (geometry.type === 'Polygon') {
    const outer = geometry.coordinates[0]
    if (Array.isArray(outer)) {
      pushRingSegments(outer as number[][])
    }
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((polygon) => {
      const outer = polygon[0]
      if (Array.isArray(outer)) {
        pushRingSegments(outer as number[][])
      }
    })
  }

  featureSegmentCache.set(feature, segments)
  return segments
}

const territoryState = computed(() => {
  const state = new Map<
    string,
    {
      ownerId: string | null
      ownerName: string
      ownerColor: string | null
      defensePower?: number | null
      isBot: boolean
      isReinforced: boolean
      reinforcementBonus: number
    }
  >()

  const playerById = new Map(props.players.map((player) => [player.id, player]))

  props.territories.forEach((territory) => {
    const ownerId = territory.ownerId ?? null
    const isBot = typeof ownerId === 'string' && ownerId.startsWith(BOT_OWNER_PREFIX)
    const owner = !isBot && ownerId ? playerById.get(ownerId) : null
    const ownerName = isBot ? 'Faction IA' : owner?.twitchUsername ?? 'Disponible'
    const ownerColor = isBot ? BOT_OWNER_COLOR : owner?.color ?? null

    const info = {
      ownerId,
      ownerName,
      ownerColor,
      defensePower: territory.defensePower ?? null,
      isBot,
      isReinforced: Boolean(territory.isReinforced),
      reinforcementBonus: Number.isFinite(territory.reinforcementBonus)
        ? Number(territory.reinforcementBonus)
        : 0
    }

    const keys = new Set<string>()
    if (territory.id) keys.add(String(territory.id))
    if (territory.code) keys.add(String(territory.code))
    if (territory.name) keys.add(String(territory.name))

    keys.forEach((key) => {
      if (key.trim().length > 0) {
        state.set(key, info)
      }
    })
  })

  return state
})

const DEFENSE_SIZE_MIN = 2
const DEFENSE_SIZE_MAX = 26
const defenseLabelSize = computed(() => {
  const rawZoom = Number.isFinite(viewZoom.value) ? (viewZoom.value as number) : initialViewState.zoom
  const minZoom = typeof initialViewState.minZoom === 'number' ? initialViewState.minZoom : 0
  const maxZoom = typeof initialViewState.maxZoom === 'number' ? initialViewState.maxZoom : 6
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, rawZoom))
  const normalized =
    maxZoom === minZoom ? 1 : Math.min(1, Math.max(0, (clampedZoom - minZoom) / (maxZoom - minZoom)))
  const size = DEFENSE_SIZE_MIN + normalized * (DEFENSE_SIZE_MAX - DEFENSE_SIZE_MIN)

  return Math.round(size)
})

const defenseLabels = computed<DefenseLabelDatum[]>(() =>
  showDefenseOverlay.value
    ? props.territories
    .map((territory) => {
      if (typeof territory.defensePower !== 'number') {
        return null
      }

      const feature = territoryFeatureLookup.get(territory.id)
      const labelPosition = toCoordinate2D(feature?.properties?.labelPosition)
      if (!labelPosition) {
        return null
      }

      const info = territoryState.value.get(territory.id)
      return {
        position: labelPosition,
        defense: territory.defensePower,
        isCurrent: info?.ownerId === props.currentPlayerId,
        isBot: info?.isBot ?? false
      }
    })
    .filter((entry): entry is DefenseLabelDatum => entry !== null)
    : []
)

const attackArrowSize = computed(() => {
  const rawZoom = Number.isFinite(viewZoom.value) ? (viewZoom.value as number) : initialViewState.zoom
  const minZoom = typeof initialViewState.minZoom === 'number' ? initialViewState.minZoom : 0
  const maxZoom = typeof initialViewState.maxZoom === 'number' ? initialViewState.maxZoom : 6
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, rawZoom))
  const normalized =
    maxZoom === minZoom ? 1 : Math.min(1, Math.max(0, (clampedZoom - minZoom) / (maxZoom - minZoom)))
  const size = ATTACK_ARROW_SIZE_MIN + normalized * (ATTACK_ARROW_SIZE_MAX - ATTACK_ARROW_SIZE_MIN)

  return Math.round(size)
})

const resolveTerritoryFeature = (rawKey: string | null | undefined): LobbyTerritoryFeature | null => {
  if (!rawKey) return null
  const key = String(rawKey).trim()
  if (!key) return null

  const direct = territoryFeatureLookup.get(key)
  if (direct) return direct

  const upper = territoryFeatureLookup.get(key.toUpperCase())
  if (upper) return upper

  const nameFeature = territoryFeatureByName.get(key.toLowerCase())
  if (nameFeature) return nameFeature

  const matchingTerritory = props.territories.find((territory) => {
    if (!territory) return false
    const idMatch = territory.id === key
    const codeMatch =
      typeof territory.code === 'string' && territory.code.trim().toUpperCase() === key.toUpperCase()
    const nameMatch =
      typeof territory.name === 'string' && territory.name.trim().toLowerCase() === key.toLowerCase()
    return idMatch || codeMatch || nameMatch
  })

  if (matchingTerritory) {
    const code = typeof matchingTerritory.code === 'string' ? matchingTerritory.code.trim() : ''
    if (code) {
      const codeFeature = territoryFeatureLookup.get(code) ?? territoryFeatureLookup.get(code.toUpperCase())
      if (codeFeature) return codeFeature
    }

    const name =
      typeof matchingTerritory.name === 'string' ? matchingTerritory.name.trim().toLowerCase() : ''
    if (name) {
      const nameFeature = territoryFeatureByName.get(name)
      if (nameFeature) return nameFeature
    }
  }

  return null
}

const computeFeatureCentroid = (feature: LobbyTerritoryFeature): Coordinate2D | null => {
  const points = collectBoundaryPoints(feature)
  if (!points.length) {
    return null
  }
  let sumLon = 0
  let sumLat = 0
  points.forEach(([lon, lat]) => {
    sumLon += lon
    sumLat += lat
  })
  const inv = 1 / points.length
  return [sumLon * inv, sumLat * inv]
}

const attackArrowMarkers = computed<AttackArrowDatum[]>(() => {
  if (!showAttackOverlay.value) return []
  const attacks = Array.isArray(props.activeAttacks) ? props.activeAttacks : []
  const markers: AttackArrowDatum[] = []

  attacks.forEach((attack) => {
    const fromFeature = resolveTerritoryFeature(attack.fromTerritory ?? null)
    const toFeature = resolveTerritoryFeature(attack.toTerritory ?? attack.territoryId ?? null)

    if (!fromFeature || !toFeature) {
      return
    }

    const fromLabel = toCoordinate2D(
      Array.isArray(fromFeature.properties?.labelPosition)
        ? fromFeature.properties?.labelPosition.slice(0, 2)
        : null
    )
    const toLabel = toCoordinate2D(
      Array.isArray(toFeature.properties?.labelPosition)
        ? toFeature.properties?.labelPosition.slice(0, 2)
        : null
    )

    const toCentroid = computeFeatureCentroid(toFeature)
    const fromCentroid = computeFeatureCentroid(fromFeature)

    const targetPoint = toLabel ?? toCentroid ?? fromCentroid
    const fallbackAnchor = fromLabel ?? fromCentroid ?? toCentroid
    if (!targetPoint || !fallbackAnchor) {
      return
    }

    const baseId =
      attack.id ??
      `${attack.fromTerritory ?? 'unknown'}-${attack.toTerritory ?? attack.territoryId ?? 'target'}`

    const fromSegments = getFeatureSegments(fromFeature)
    const toSegments = getFeatureSegments(toFeature)
    if (!fromSegments.length || !toSegments.length) {
      return
    }

    const toSegmentKeys = new Set(toSegments.map((segment) => segment.canonicalKey))
    const sharedSegments = fromSegments.filter((segment) => toSegmentKeys.has(segment.canonicalKey))

    if (sharedSegments.length === 0) {
      const { direction, length } = toVector(fallbackAnchor, targetPoint)
      if (length <= BORDER_DISTANCE_EPSILON) {
        return
      }
      const span = Math.min(4, Math.max(1.2, length * 0.6))
      const startPoint: Coordinate2D = [
        fallbackAnchor[0] - direction[0] * span * 0.25,
        fallbackAnchor[1] - direction[1] * span * 0.25
      ]
      const fractions = [0.25, 0.5, 0.75]
      fractions.forEach((fraction, index) => {
        const position: Coordinate2D = [
          startPoint[0] + direction[0] * span * fraction,
          startPoint[1] + direction[1] * span * fraction
        ]
        const angle = Math.atan2(direction[1], direction[0])
        markers.push({
          id: `${baseId}#fallback-${index}`,
          position,
          angle
        })
      })
      return
    }

    const totalSharedLength = sharedSegments.reduce((sum, segment) => sum + segment.length, 0)
    if (totalSharedLength <= BORDER_DISTANCE_EPSILON) {
      return
    }

    const fractions: number[] = [0.25, 0.5, 0.75]
    fractions.forEach((fraction, index) => {
      const targetDistance = totalSharedLength * fraction
      let accumulated = 0
      for (const segment of sharedSegments) {
        if (accumulated + segment.length < targetDistance - BORDER_DISTANCE_EPSILON) {
          accumulated += segment.length
          continue
        }

        const remaining = targetDistance - accumulated
        const ratio = segment.length > 0 ? Math.max(0, Math.min(1, remaining / segment.length)) : 0
        const basePoint: Coordinate2D = [
          segment.start[0] + (segment.end[0] - segment.start[0]) * ratio,
          segment.start[1] + (segment.end[1] - segment.start[1]) * ratio
        ]
        const { direction: attackDirection, length: attackLength } = toVector(basePoint, targetPoint)
        const finalDirection =
          attackLength > BORDER_DISTANCE_EPSILON ? attackDirection : segment.direction
        const offsetMagnitude =
          attackLength > BORDER_DISTANCE_EPSILON
            ? Math.min(0.3, Math.max(0.05, attackLength * 0.08))
            : Math.min(0.2, Math.max(0.04, segment.length * 0.15))
        const position: Coordinate2D = [
          basePoint[0] + finalDirection[0] * offsetMagnitude,
          basePoint[1] + finalDirection[1] * offsetMagnitude
        ]
        const angle = Math.atan2(finalDirection[1], finalDirection[0])
        markers.push({
          id: `${baseId}#border-${index}`,
          position,
          angle
        })
        accumulated = targetDistance
        break
      }
    })
  })

  return markers
})

const attackArrowTriggerKey = computed(() =>
  attackArrowMarkers.value
    .map((marker) => `${marker.id}:${marker.position[0]}:${marker.position[1]}:${marker.angle}`)
    .join('|')
)

const colorTrigger = computed(() =>
  props.territories
    .map((territory) => {
      const playerColor = props.players.find((player) => player.id === territory.ownerId)?.color ?? ''
      const defense = typeof territory.defensePower === 'number' ? territory.defensePower : 'na'
      return `${territory.id}:${territory.ownerId ?? 'none'}:${playerColor}:${defense}`
    })
    .join('|')
)

type DeckFeature = LobbyTerritoryFeature

const featureCollection: LobbyTerritoryCollection = lobbyTerritories
const territoryFeatureLookup = new Map(
  featureCollection.features.map((feature) => [feature.properties?.id ?? '', feature])
)
const territoryFeatureByName = new Map<string, LobbyTerritoryFeature>()
featureCollection.features.forEach((feature) => {
  const name = feature.properties?.name
  if (typeof name === 'string' && name.trim() !== '') {
    territoryFeatureByName.set(name.trim().toLowerCase(), feature)
  }
})

const hexToRgba = (hex: string | null | undefined, alpha: number): [number, number, number, number] => {
  if (!hex) {
    return [...DEFAULT_OCCUPIED_COLOR.slice(0, 3), alpha] as [number, number, number, number]
  }

  let parsed = hex.replace('#', '')

  if (parsed.length === 3) {
    parsed = parsed
      .split('')
      .map((char) => char + char)
      .join('')
  }

  if (parsed.length !== 6) {
    return [...DEFAULT_OCCUPIED_COLOR.slice(0, 3), alpha] as [number, number, number, number]
  }

  const bigint = Number.parseInt(parsed, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255

  return [r, g, b, alpha]
}

const computeFillColor = (feature: DeckFeature) => {
  const territoryId = feature.properties?.id
  if (!territoryId) {
    return DEFAULT_AVAILABLE_COLOR
  }

  const info = territoryState.value.get(territoryId)
  if (!info || !info.ownerId) {
    return DEFAULT_AVAILABLE_COLOR
  }

  const baseColor = info.ownerColor ? hexToRgba(info.ownerColor, 210) : DEFAULT_OCCUPIED_COLOR

  if (info.ownerId === props.currentPlayerId) {
    const color = info.ownerColor ? hexToRgba(info.ownerColor, info.isReinforced ? 255 : 235) : CURRENT_PLAYER_FALLBACK_COLOR
    if (info.isReinforced && Array.isArray(color)) {
      return [
        Math.min(255, color[0] + 12),
        Math.min(255, color[1] + 18),
        Math.min(255, color[2] + 18),
        color[3]
      ]
    }
    return color
  }

  if (info.isBot) {
    return hexToRgba(info.ownerColor, 210)
  }

  if (info.isReinforced) {
    return [
      Math.min(255, baseColor[0]),
      Math.min(255, baseColor[1] + 20),
      Math.min(255, baseColor[2] + 35),
      baseColor[3]
    ]
  }

  return baseColor
}

const computeLineColor = (feature: DeckFeature) => {
  const territoryId = feature.properties?.id
  if (!territoryId) {
    return DEFAULT_BORDER_COLOR
  }

  const info = territoryState.value.get(territoryId)
  if (info?.isBot) {
    return BOT_HIGHLIGHT_COLOR
  }
  if (info?.ownerId === props.currentPlayerId) {
    return CURRENT_PLAYER_BORDER_COLOR
  }

  return DEFAULT_BORDER_COLOR
}

const tooltipFn = ({ object }: PickingInfo<DeckFeature>) => {
  if (!object?.properties?.id) return null

  const territoryId = object.properties.id
  const info = territoryState.value.get(territoryId)

  const lines = [object.properties.name]
  const status = info?.ownerId ? `Contrôlé par ${info.ownerName}` : 'Disponible'
  lines.push(status)

  if (showDefenseOverlay.value && typeof info?.defensePower === 'number' && info.defensePower > 0) {
    lines.push(`Défense: ${info.defensePower}`)
  }

  if (info?.isReinforced && typeof info.reinforcementBonus === 'number' && info.reinforcementBonus > 0) {
    lines.push(`Renfort actif: ${info.reinforcementBonus}`)
  }

  return {
    text: lines.join('\n')
  }
}

const getCursor = ({
  isDragging,
  isHovering
}: {
  isDragging: boolean
  isHovering: boolean
}) => {
  if (props.disableInteraction) {
    return 'default'
  }

  if (isDragging) {
    return 'grabbing'
  }

  return isHovering ? 'pointer' : 'grab'
}

const selectableTerritoryIds = computed(() => new Set(props.territories.map((territory) => territory.id)))

const createGeoLayer = () =>
  new GeoJsonLayer<any>({
    id: 'lobby-territories',
    data: featureCollection,
    pickable: !props.disableInteraction,
    stroked: true,
    filled: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 120],
    lineWidthUnits: 'pixels',
    lineWidthMinPixels: 1.5,
    getLineColor: (feature: any) => computeLineColor(feature as DeckFeature),
    getFillColor: (feature: any) => computeFillColor(feature as DeckFeature),
    parameters: {
      depthTest: false
    } as Record<string, unknown>,
    onClick: (info: PickingInfo<DeckFeature>) => {
      if (props.disableInteraction) return
      const territoryId = info.object?.properties?.id
      if (territoryId && selectableTerritoryIds.value.has(territoryId)) {
        emit('select', territoryId)
      }
    },
    updateTriggers: {
      getFillColor: colorTrigger.value,
      getLineColor: colorTrigger.value
    }
  })

const createDefenseLayer = () =>
  new TextLayer<DefenseLabelDatum>({
    id: 'territory-defense-labels',
    data: defenseLabels.value,
    billboard: false,
    getPosition: (item) => item.position,
    getText: (item) => `🛡${item.defense}`,
    getColor: (item) => {
      if (item.isCurrent) {
        return [248, 250, 252, 255]
      }
      if (item.isBot) {
        return [148, 163, 184, 255]
      }
      return [226, 232, 240, 255]
    },
    getSize: () => defenseLabelSize.value,
    sizeUnits: 'pixels',
    sizeMinPixels: Math.max(6, defenseLabelSize.value - 8),
    sizeMaxPixels: Math.min(36, defenseLabelSize.value + 10),
    getTextAnchor: () => 'middle',
    getAlignmentBaseline: () => 'center',
    characterSet: 'auto',
    updateTriggers: {
      getSize: defenseLabelSize.value,
      getColor: defenseLabelSize.value,
      sizeMinPixels: defenseLabelSize.value,
      sizeMaxPixels: defenseLabelSize.value
    }
  })

const createAttackArrowLayer = () =>
  new TextLayer<AttackArrowDatum>({
    id: 'active-attack-arrows',
    data: attackArrowMarkers.value,
    billboard: false,
    getPosition: (item) => item.position,
    getText: () => '➤',
    getColor: () => ATTACK_ARROW_COLOR,
    getSize: () => attackArrowSize.value,
    sizeUnits: 'pixels',
    sizeMinPixels: Math.max(10, attackArrowSize.value - 6),
    sizeMaxPixels: Math.min(40, attackArrowSize.value + 6),
    getTextAnchor: () => 'middle',
    getAlignmentBaseline: () => 'center',
    getAngle: (item) => item.angle,
    characterSet: '➤',
    parameters: {
      depthTest: false
    } as Record<string, unknown>,
    updateTriggers: {
      getPosition: attackArrowTriggerKey.value,
      getAngle: attackArrowTriggerKey.value,
      getSize: attackArrowSize.value
    }
  })

const layers = computed((): any[] => {
  const baseLayers: any[] = [createGeoLayer()]
  if (showDefenseOverlay.value) {
    baseLayers.push(createDefenseLayer())
  }
  if (showAttackOverlay.value && attackArrowMarkers.value.length > 0) {
    baseLayers.push(createAttackArrowLayer())
  }
  return baseLayers
})

onMounted(() => {
  if (!containerRef.value) return

  deckInstance = new Deck({
    parent: containerRef.value,
    initialViewState,
    controller: {
      doubleClickZoom: false
    },
    layers: layers.value,
    getCursor,
    getTooltip: tooltipFn,
    onViewStateChange: ({ viewState }) => {
      if (Number.isFinite(viewState.zoom)) {
        viewZoom.value = viewState.zoom as number
        if (deckInstance) {
          deckInstance.setProps({
            layers: layers.value
          })
        }
      }
    }
  })
})

watch(
  () => props.disableInteraction,
  () => {
    if (!deckInstance) return
    deckInstance.setProps({
      getCursor,
      layers: layers.value
    })
  }
)

watch(
  [
    layers,
    territoryState,
    defenseLabels,
    attackArrowMarkers,
    showDefenseOverlay,
    showAttackOverlay,
    defenseLabelSize,
    attackArrowSize,
    attackArrowTriggerKey
  ],
  () => {
    if (!deckInstance) return
    deckInstance.setProps({
      layers: layers.value
    })
  }
)

watch(viewZoom, () => {
  if (!deckInstance) return
  deckInstance.setProps({
    layers: layers.value
  })
})

onBeforeUnmount(() => {
  if (deckInstance) {
    deckInstance.finalize()
    deckInstance = null
  }
})
</script>

<template>
  <div ref="containerRef" :class="containerClass" />
</template>

<style scoped>
.lobby-map-canvas {
  position: relative;
  width: 100%;
  min-height: 420px;
  height: 100%;
  border-radius: 0.75rem;
  overflow: hidden;
  background: radial-gradient(circle at 50% 30%, rgba(148, 163, 184, 0.15), rgba(30, 41, 59, 0.85));
}

.lobby-map-canvas--game {
  min-height: 100%;
  border-radius: 0;
}
</style>
