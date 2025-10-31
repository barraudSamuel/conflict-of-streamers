<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { COORDINATE_SYSTEM, Deck } from '@deck.gl/core'
import type { Color, PickingInfo } from '@deck.gl/core'
import { GeoJsonLayer, TextLayer } from '@deck.gl/layers'
import { SimpleMeshLayer } from '@deck.gl/mesh-layers'
import {
  lobbyTerritories,
  type LobbyTerritoryCollection,
  type LobbyTerritoryFeature
} from '@/data/lobbyTerritories'
import earcut from 'earcut'

interface LobbyTerritory {
  id: string
  ownerId?: string | null
  defensePower?: number | null
  code?: string | null
  name?: string | null
  isReinforced?: boolean | null
  reinforcementBonus?: number | null
}

interface LobbyPlayer {
  id: string
  twitchUsername?: string | null
  color?: string | null
  avatarUrl?: string | null
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
const viewZoom = ref(initialViewState.zoom)

const DEFAULT_AVAILABLE_COLOR: Color = [168, 162, 158, 255]
const DEFAULT_OCCUPIED_COLOR: Color = [120, 113, 108, 255]
const DEFAULT_BORDER_COLOR: Color = [30, 41, 59, 240]
const CURRENT_PLAYER_BORDER_COLOR: Color = [226, 232, 240, 255]
const CURRENT_PLAYER_FALLBACK_COLOR: Color = [34, 197, 94, 220]
const BOT_OWNER_PREFIX = 'bot:'
const BOT_OWNER_COLOR = '#a8a29e'
const BOT_HIGHLIGHT_COLOR: Color = [100, 116, 139, 210]
const MIN_POLYGON_EXTENT = 1e-6

const toColorTuple = (color: Color): [number, number, number, number] => {
  if (Array.isArray(color)) {
    const [r = 0, g = 0, b = 0, a = 255] = color
    return [r, g, b, a]
  }
  const [r = 0, g = 0, b = 0, a = 255] = Array.from(color)
  return [r, g, b, a]
}

interface DefenseLabelDatum {
  position: [number, number]
  defense: number
  isCurrent: boolean
  isBot: boolean
}

interface AvatarMeshAttributes {
  attributes: {
    POSITION: { size: 3; value: Float32Array }
    TEXCOORD_0: { size: 2; value: Float32Array }
  }
  indices: { size: 1; value: Uint16Array | Uint32Array }
}

interface AvatarMeshDatum {
  id: string
  mesh: AvatarMeshAttributes
  texture: string
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

const sanitizeRing = (ring: number[][]): Coordinate2D[] => {
  const coords: Coordinate2D[] = []
  ring.forEach((coordinate) => {
    const pair = toCoordinate2D(coordinate)
    if (pair) {
      coords.push(pair)
    }
  })

  if (coords.length >= 2) {
    const first = coords[0]
    const last = coords[coords.length - 1]
    if (
      first &&
      last &&
      Math.abs(first[0] - last[0]) < 1e-9 &&
      Math.abs(first[1] - last[1]) < 1e-9
    ) {
      coords.pop()
    }
  }

  return coords
}

const gatherPolygons = (feature: LobbyTerritoryFeature): Coordinate2D[][][] => {
  const geometry = feature.geometry
  if (!geometry) {
    return []
  }

  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates
      .map((ring) => sanitizeRing(ring as number[][]))
      .filter((ring) => ring.length >= 3)
    return rings.length ? [rings] : []
  }

  if (geometry.type === 'MultiPolygon') {
    const candidates = geometry.coordinates
      .map((polygon) =>
        polygon
          .map((ring) => sanitizeRing(ring as number[][]))
          .filter((ring) => ring.length >= 3)
      )
      .filter((rings) => rings.length > 0)

    return candidates
  }

  return []
}

const territoryAvatarMeshes = computed<AvatarMeshDatum[]>(() => {
  const meshes: AvatarMeshDatum[] = []
  const playerById = new Map(props.players.map((player) => [player.id, player]))

  props.territories.forEach((territory) => {
    const ownerId = territory.ownerId ?? null
    if (!ownerId || typeof ownerId !== 'string' || ownerId.startsWith(BOT_OWNER_PREFIX)) {
      return
    }

    const owner = playerById.get(ownerId)
    const avatarUrl =
      typeof owner?.avatarUrl === 'string' && owner.avatarUrl.trim() !== ''
        ? owner.avatarUrl.trim()
        : null

    if (!avatarUrl) {
      return
    }

    const feature =
      resolveTerritoryFeature(territory.id ?? territory.code ?? territory.name ?? null) ?? null
    if (!feature) {
      return
    }

    const polygons = gatherPolygons(feature)
    if (!polygons.length) {
      return
    }

    let minLon = Number.POSITIVE_INFINITY
    let minLat = Number.POSITIVE_INFINITY
    let maxLon = Number.NEGATIVE_INFINITY
    let maxLat = Number.NEGATIVE_INFINITY

    polygons.forEach((rings) => {
      rings.forEach((ring) => {
        ring.forEach(([lon, lat]) => {
          if (lon < minLon) minLon = lon
          if (lon > maxLon) maxLon = lon
          if (lat < minLat) minLat = lat
          if (lat > maxLat) maxLat = lat
        })
      })
    })

    const width = maxLon - minLon
    const height = maxLat - minLat
    if (width < MIN_POLYGON_EXTENT || height < MIN_POLYGON_EXTENT) {
      return
    }

    const scale = Math.max(width, height)
    const widthNorm = width / scale
    const heightNorm = height / scale
    const uOffset = (1 - widthNorm) * 0.5
    const vOffset = (1 - heightNorm) * 0.5

    polygons.forEach((rings, polygonIndex) => {
      const flattened: number[] = []
      const holeIndices: number[] = []
      let vertexCount = 0

      rings.forEach((ring, ringIndex) => {
        if (ring.length < 3) return
        if (ringIndex > 0) {
          holeIndices.push(vertexCount)
        }
        ring.forEach(([lon, lat]) => {
          flattened.push(lon, lat)
          vertexCount += 1
        })
      })

      if (vertexCount < 3) {
        return
      }

      const indices = earcut(flattened, holeIndices, 2)
      if (!indices || indices.length === 0) {
        return
      }

      const positions = new Float32Array(vertexCount * 3)
      const texCoords = new Float32Array(vertexCount * 2)

      for (let i = 0; i < vertexCount; i += 1) {
        const lonIndex = i * 2
        const latIndex = lonIndex + 1
        const lon = flattened[lonIndex] ?? 0
        const lat = flattened[latIndex] ?? 0
        positions[i * 3] = lon
        positions[i * 3 + 1] = lat
        positions[i * 3 + 2] = 0

        const u = ((lon - minLon) / scale + uOffset) || 0
        const v = ((lat - minLat) / scale + vOffset) || 0
        texCoords[i * 2] = Math.min(1, Math.max(0, u))
        texCoords[i * 2 + 1] = 1 - Math.min(1, Math.max(0, v))
      }

      const indexArray =
        vertexCount > 65535 ? new Uint32Array(indices) : new Uint16Array(indices)

      meshes.push({
        id: `${territory.id ?? feature.properties?.id ?? 'unknown'}:${ownerId}:${polygonIndex}`,
        mesh: {
          attributes: {
            POSITION: { size: 3, value: positions },
            TEXCOORD_0: { size: 2, value: texCoords }
          },
          indices: { size: 1, value: indexArray }
        },
        texture: avatarUrl
      })
    })
  })

  return meshes
})


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

const hexToRgba = (hex: string | null | undefined, alpha: number): Color => {
  if (!hex) {
    return [...DEFAULT_OCCUPIED_COLOR.slice(0, 3), alpha] as Color
  }

  let parsed = hex.replace('#', '')

  if (parsed.length === 3) {
    parsed = parsed
      .split('')
      .map((char) => char + char)
      .join('')
  }

  if (parsed.length !== 6) {
    return [...DEFAULT_OCCUPIED_COLOR.slice(0, 3), alpha] as Color
  }

  const bigint = Number.parseInt(parsed, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255

  return [r, g, b, alpha] as Color
}

const computeFillColor = (feature: DeckFeature): Color => {
  const territoryId = feature.properties?.id
  if (!territoryId) {
    return DEFAULT_AVAILABLE_COLOR
  }

  const info = territoryState.value.get(territoryId)
  if (!info || !info.ownerId) {
    return DEFAULT_AVAILABLE_COLOR
  }

  const isBot = info.isBot
  if (info.ownerId === props.currentPlayerId) {
    if (isBot) {
      const botColor = toColorTuple(hexToRgba(info.ownerColor, info.isReinforced ? 255 : 235))
      if (info.isReinforced) {
        return [
          Math.min(255, botColor[0] + 10),
          Math.min(255, botColor[1] + 14),
          Math.min(255, botColor[2] + 18),
          botColor[3]
        ] as Color
      }
      return botColor as Color
    }

    const highlight = toColorTuple(CURRENT_PLAYER_FALLBACK_COLOR)
    if (info.isReinforced) {
      return [
        Math.min(255, highlight[0] + 12),
        Math.min(255, highlight[1] + 18),
        Math.min(255, highlight[2] + 16),
        highlight[3]
      ] as Color
    }
    return highlight as Color
  }

  if (isBot) {
    const botColor = toColorTuple(hexToRgba(info.ownerColor, info.isReinforced ? 235 : 210))
    if (info.isReinforced) {
      return [
        Math.min(255, botColor[0] + 8),
        Math.min(255, botColor[1] + 12),
        Math.min(255, botColor[2] + 16),
        botColor[3]
      ] as Color
    }
    return botColor as Color
  }

  if (info.isReinforced) {
    const baseColor = toColorTuple(DEFAULT_OCCUPIED_COLOR)
    return [
      Math.min(255, baseColor[0] + 6),
      Math.min(255, baseColor[1] + 18),
      Math.min(255, baseColor[2] + 28),
      baseColor[3]
    ] as Color
  }

  return DEFAULT_OCCUPIED_COLOR
}

const computeLineColor = (feature: DeckFeature): Color => {
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

const DARK_TEXT_CURRENT: Color = [15, 23, 42, 255] // tailwind slate-900
const DARK_TEXT_BOT: Color = [68, 64, 60, 255] // tailwind stone-700
const DARK_TEXT_DEFAULT: Color = [87, 83, 78, 255] // tailwind stone-600

const createDefenseLayer = () =>
  new TextLayer<DefenseLabelDatum>({
    id: 'territory-defense-labels',
    data: defenseLabels.value,
    billboard: false,
    getPosition: (item) => item.position,
    getText: (item) => `🛡${item.defense}`,
    getColor: (item) => {
      if (item.isCurrent) {
        return DARK_TEXT_CURRENT
      }
      if (item.isBot) {
        return DARK_TEXT_BOT
      }
      return DARK_TEXT_DEFAULT
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

const createAvatarMeshLayers = () =>
  territoryAvatarMeshes.value.map(
    (datum) =>
      new SimpleMeshLayer({
        id: `territory-owner-avatar-${datum.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
        data: [datum],
        mesh: datum.mesh,
        texture: datum.texture,
        getPosition: () => [0, 0, 0],
        getColor: [255, 255, 255, 255],
        sizeScale: 1,
        coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
        pickable: false,
        parameters: {
          depthTest: false
        } as Record<string, unknown>,
        _instanced: false
      })
  )

const layers = computed((): any[] => {
  const baseLayers: any[] = [createGeoLayer()]
  if (territoryAvatarMeshes.value.length > 0) {
    baseLayers.push(...createAvatarMeshLayers())
  }
  if (showDefenseOverlay.value) {
    baseLayers.push(createDefenseLayer())
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
    territoryAvatarMeshes,
    defenseLabels,
    showDefenseOverlay,
    defenseLabelSize
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
  background: #38bdf8;
}

.lobby-map-canvas--game {
  min-height: 100%;
  border-radius: 0;
}
</style>
