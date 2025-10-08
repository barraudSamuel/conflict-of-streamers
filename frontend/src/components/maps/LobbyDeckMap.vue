<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Deck } from '@deck.gl/core'
import type { PickingInfo } from '@deck.gl/core'
import { GeoJsonLayer } from '@deck.gl/layers'
import {
  lobbyTerritories,
  type LobbyTerritoryCollection,
  type LobbyTerritoryFeature
} from '@/data/lobbyTerritories'

interface LobbyTerritory {
  id: string
  ownerId?: string | null
  defensePower?: number | null
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
}>()

const emit = defineEmits<{
  (event: 'select', territoryId: string): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
let deckInstance: Deck | null = null

const initialViewState = {
  longitude: 15,
  latitude: 15,
  zoom: 1.3,
  minZoom: 0.6,
  maxZoom: 5,
  bearing: 0,
  pitch: 0
}

const DEFAULT_AVAILABLE_COLOR: [number, number, number, number] = [71, 85, 105, 130]
const DEFAULT_OCCUPIED_COLOR: [number, number, number, number] = [148, 163, 184, 210]
const DEFAULT_BORDER_COLOR: [number, number, number, number] = [30, 41, 59, 220]
const CURRENT_PLAYER_BORDER_COLOR: [number, number, number, number] = [226, 232, 240, 255]
const CURRENT_PLAYER_FALLBACK_COLOR: [number, number, number, number] = [34, 197, 94, 220]

const territoryState = computed(() => {
  const state = new Map<
    string,
    {
      ownerId: string | null
      ownerName: string
      ownerColor: string | null
      defensePower?: number | null
    }
  >()

  const playerById = new Map(props.players.map((player) => [player.id, player]))

  props.territories.forEach((territory) => {
    const ownerId = territory.ownerId ?? null
    const owner = ownerId ? playerById.get(ownerId) : null

    state.set(territory.id, {
      ownerId,
      ownerName: owner?.twitchUsername ?? 'Disponible',
      ownerColor: owner?.color ?? null,
      defensePower: territory.defensePower ?? null
    })
  })

  return state
})

const colorTrigger = computed(() =>
  props.territories
    .map((territory) => {
      const playerColor = props.players.find((player) => player.id === territory.ownerId)?.color ?? ''
      return `${territory.id}:${territory.ownerId ?? 'none'}:${playerColor}`
    })
    .join('|')
)

type DeckFeature = LobbyTerritoryFeature

const featureCollection: LobbyTerritoryCollection = lobbyTerritories

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

  return hexToRgba(info.ownerColor, 210)
}

const computeLineColor = (feature: DeckFeature) => {
  const territoryId = feature.properties?.id
  if (!territoryId) {
    return DEFAULT_BORDER_COLOR
  }

  const info = territoryState.value.get(territoryId)
  if (info?.ownerId === props.currentPlayerId) {
    return CURRENT_PLAYER_BORDER_COLOR
  }

  return DEFAULT_BORDER_COLOR
}

const tooltipFn = ({ object }: PickingInfo<DeckFeature>) => {
  if (!object?.properties?.id) return null

  const territoryId = object.properties.id
  const info = territoryState.value.get(territoryId)

  const status = info?.ownerId ? `Contrôlé par ${info.ownerName}` : 'Disponible'

  return {
    text: `${object.properties.name}\n${status}`
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

const layers = computed(() => [createGeoLayer()])

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
    getTooltip: tooltipFn
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

watch([layers, territoryState], () => {
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
  <div ref="containerRef" class="lobby-map-canvas" />
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
</style>
