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

const props = defineProps<{
  territories: LobbyTerritory[]
  players: LobbyPlayer[]
  currentPlayerId: string
  disableInteraction?: boolean
  appearance?: 'lobby' | 'game'
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

const DEFAULT_AVAILABLE_COLOR: [number, number, number, number] = [71, 85, 105, 130]
const DEFAULT_OCCUPIED_COLOR: [number, number, number, number] = [148, 163, 184, 210]
const DEFAULT_BORDER_COLOR: [number, number, number, number] = [30, 41, 59, 220]
const CURRENT_PLAYER_BORDER_COLOR: [number, number, number, number] = [226, 232, 240, 255]
const CURRENT_PLAYER_FALLBACK_COLOR: [number, number, number, number] = [34, 197, 94, 220]
const BOT_OWNER_PREFIX = 'bot:'
const BOT_OWNER_COLOR = '#64748b'
const BOT_HIGHLIGHT_COLOR: [number, number, number, number] = [100, 116, 139, 210]

interface DefenseLabelDatum {
  position: [number, number]
  defense: number
  isCurrent: boolean
  isBot: boolean
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
      isBot
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
      const labelPosition = feature?.properties?.labelPosition
      if (!labelPosition || !Array.isArray(labelPosition) || labelPosition.length < 2) {
        return null
      }

      const info = territoryState.value.get(territory.id)
      return {
        position: labelPosition as [number, number],
        defense: territory.defensePower,
        isCurrent: info?.ownerId === props.currentPlayerId,
        isBot: info?.isBot ?? false
      }
    })
    .filter((entry): entry is DefenseLabelDatum => entry !== null)
    : []
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

  if (info.ownerId === props.currentPlayerId) {
    return info.ownerColor ? hexToRgba(info.ownerColor, 235) : CURRENT_PLAYER_FALLBACK_COLOR
  }

  if (info.isBot) {
    return hexToRgba(info.ownerColor, 210)
  }

  return hexToRgba(info.ownerColor, 210)
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
    characterSet: 'auto'
  })

const layers = computed((): any[] => {
  const baseLayers: any[] = [createGeoLayer()]
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

watch([layers, territoryState, defenseLabels, showDefenseOverlay, defenseLabelSize], () => {
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
