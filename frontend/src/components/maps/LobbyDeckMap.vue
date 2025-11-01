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
  isUnderAttack?: boolean | null
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
  attackableTerritoryIds?: string[] | null
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
const ATTACK_TARGET_BORDER_COLOR_PRIMARY: Color = [248, 113, 113, 255] // tailwind rose-400
const ATTACK_TARGET_BORDER_COLOR_SECONDARY: Color = [251, 191, 36, 220] // tailwind amber-400
const ATTACK_TARGET_FILL_COLOR_PRIMARY: Color = [248, 113, 113, 110]
const ATTACK_TARGET_FILL_COLOR_SECONDARY: Color = [248, 113, 113, 60]
const UNDER_ATTACK_BORDER_COLOR_PRIMARY: Color = [248, 113, 113, 255] // tailwind rose-400
const UNDER_ATTACK_BORDER_COLOR_SECONDARY: Color = [220, 38, 38, 255] // tailwind red-600
const UNDER_ATTACK_FILL_COLOR: Color = [220, 38, 38, 51] // ~20% opacity overlay
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
      isUnderAttack: boolean
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
        : 0,
      isUnderAttack: Boolean(territory.isUnderAttack)
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

const territoryTextures = ref<Record<string, string>>({})
const territoryTextureKeys = ref<Record<string, string>>({})
const pendingSplitTextureTokens = new Map<string, number>()
let splitTextureGenerationCounter = 0

interface ParticipantTextureInfo {
  avatar: string | null
  colorTexture: string | null
  color: string | null
}

interface TerritoryTextureDescriptor {
  territoryId: string
  ownerId: string | null
  attackerId: string | null
  owner: ParticipantTextureInfo
  attacker: ParticipantTextureInfo
  isUnderAttack: boolean
}

const solidColorTextureCache = new Map<string, string>()

const sanitizeColorString = (input: string | null | undefined): string | null => {
  if (typeof input !== 'string') {
    return null
  }
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }
  return trimmed.replace(/["'<>\n\r]/g, '')
}

const colorArrayToCss = (color: Color): string => {
  const [r = 0, g = 0, b = 0, a = 255] = color
  const alpha = Math.max(0, Math.min(1, a / 255))
  if (alpha >= 1) {
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
  }
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Number(
    alpha.toFixed(3)
  )})`
}

const DEFAULT_DEFENDER_TEXTURE_COLOR = colorArrayToCss(DEFAULT_OCCUPIED_COLOR)
const DEFAULT_ATTACKER_TEXTURE_COLOR = colorArrayToCss(UNDER_ATTACK_BORDER_COLOR_PRIMARY)

const getSolidColorTexture = (color: string | null | undefined): string | null => {
  const sanitized = sanitizeColorString(color)
  if (!sanitized) {
    return null
  }
  const key = sanitized.toLowerCase()
  if (solidColorTextureCache.has(key)) {
    return solidColorTextureCache.get(key) as string
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="${sanitized}"/></svg>`
  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  solidColorTextureCache.set(key, dataUrl)
  return dataUrl
}

const resolveParticipantTexture = (
  playerId: string | null,
  playersById: Map<string, LobbyPlayer>,
  fallbackColor?: string | null
): ParticipantTextureInfo => {
  const sanitizedFallback = sanitizeColorString(fallbackColor)

  if (!playerId) {
    return {
      avatar: null,
      colorTexture: sanitizedFallback ? getSolidColorTexture(sanitizedFallback) : null,
      color: sanitizedFallback ?? null
    }
  }

  if (playerId.startsWith(BOT_OWNER_PREFIX)) {
    const botColor = sanitizeColorString(
      sanitizedFallback ?? BOT_OWNER_COLOR ?? DEFAULT_DEFENDER_TEXTURE_COLOR
    )
    return {
      avatar: null,
      colorTexture: botColor ? getSolidColorTexture(botColor) : null,
      color: botColor ?? null
    }
  }

  const player = playersById.get(playerId) ?? null

  const avatarUrl =
    typeof player?.avatarUrl === 'string' && player.avatarUrl.trim() !== ''
      ? player.avatarUrl.trim()
      : null

  if (avatarUrl) {
    return {
      avatar: avatarUrl,
      colorTexture: null,
      color: sanitizedFallback ?? null
    }
  }

  const playerColor =
    typeof player?.color === 'string' && player.color.trim() !== ''
      ? player.color.trim()
      : null

  const resolvedColor = sanitizeColorString(playerColor ?? sanitizedFallback ?? null)
  return {
    avatar: null,
    colorTexture: resolvedColor ? getSolidColorTexture(resolvedColor) : null,
    color: resolvedColor ?? null
  }
}

const activeAttackByTerritory = computed(() => {
  const map = new Map<string, ActiveAttack>()
  ;(props.activeAttacks ?? []).forEach((attack) => {
    if (!attack) return
    const territoryKey =
      (typeof attack.territoryId === 'string' && attack.territoryId.trim() !== ''
        ? attack.territoryId.trim()
        : null) ||
      (typeof attack.toTerritory === 'string' && attack.toTerritory.trim() !== ''
        ? attack.toTerritory.trim()
        : null)
    if (!territoryKey) {
      return
    }
    map.set(territoryKey, attack)
  })
  return map
})

const territoryTextureDescriptors = computed<TerritoryTextureDescriptor[]>(() => {
  const playersById = new Map(props.players.map((player) => [player.id, player]))
  return props.territories.map((territory) => {
    const territoryId =
      typeof territory.id === 'string' && territory.id.trim() !== '' ? territory.id.trim() : ''
    const ownerId =
      typeof territory.ownerId === 'string' && territory.ownerId.trim() !== ''
        ? territory.ownerId.trim()
        : null
    const activeAttack = territoryId ? activeAttackByTerritory.value.get(territoryId) ?? null : null
    const attackerId =
      typeof activeAttack?.attackerId === 'string' && activeAttack.attackerId.trim() !== ''
        ? activeAttack.attackerId.trim()
        : null
    const attacker = attackerId ? playersById.get(attackerId) ?? null : null

    const stateInfo = territoryId ? territoryState.value.get(territoryId) ?? null : null
    const ownerColor =
      typeof stateInfo?.ownerColor === 'string' && stateInfo.ownerColor.trim() !== ''
        ? stateInfo.ownerColor.trim()
        : null

    const ownerTexture = resolveParticipantTexture(
      ownerId,
      playersById,
      ownerColor ?? (ownerId?.startsWith(BOT_OWNER_PREFIX) ? BOT_OWNER_COLOR : null)
    )

    const attackerColor =
      attackerId?.startsWith(BOT_OWNER_PREFIX) === true
        ? BOT_OWNER_COLOR
        : typeof attacker?.color === 'string' && attacker.color.trim() !== ''
          ? attacker.color.trim()
          : null

    const attackerTexture = resolveParticipantTexture(attackerId, playersById, attackerColor)

    return {
      territoryId,
      ownerId,
      attackerId,
      owner: ownerTexture,
      attacker: attackerTexture,
      isUnderAttack: Boolean(activeAttack)
    }
  })
})

const territoryTextureSignature = computed(() =>
  territoryTextureDescriptors.value
    .map((descriptor) =>
      [
        descriptor.territoryId,
        descriptor.ownerId ?? '',
        descriptor.owner.avatar ?? descriptor.owner.color ?? '',
        descriptor.isUnderAttack ? 'attack' : 'idle',
        descriptor.attackerId ?? '',
        descriptor.attacker.avatar ?? descriptor.attacker.color ?? ''
      ].join(':')
    )
    .join('|')
)

const splitTextureCache = new Map<string, string>()
const splitTexturePromiseCache = new Map<string, Promise<string>>()

const territoryTextureDescriptorLookup = computed(() => {
  const lookup = new Map<string, TerritoryTextureDescriptor>()
  territoryTextureDescriptors.value.forEach((descriptor) => {
    if (!descriptor.territoryId) {
      return
    }
    lookup.set(descriptor.territoryId, descriptor)
  })
  return lookup
})

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error('Image constructor unavailable in this environment'))
      return
    }
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    image.src = url
  })

const createSplitTexture = async (leftUrl: string, rightUrl: string): Promise<string> => {
  // Build a side-by-side texture so under-attack territories show defender (left) vs attacker (right)
  if (typeof document === 'undefined') {
    return leftUrl
  }

  const [leftImage, rightImage] = await Promise.all([loadImage(leftUrl), loadImage(rightUrl)])
  const canvas = document.createElement('canvas')
  const size = 256
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) {
    return leftUrl
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.clearRect(0, 0, size, size)
  context.fillStyle = '#0f172a' // tailwind slate-900
  context.globalAlpha = 0.12
  context.fillRect(0, 0, size, size)
  context.globalAlpha = 1
  const drawCover = (image: HTMLImageElement, x: number, y: number, width: number, height: number) => {
    const naturalWidth = image.naturalWidth || image.width
    const naturalHeight = image.naturalHeight || image.height

    if (!naturalWidth || !naturalHeight) {
      context.drawImage(image, x, y, width, height)
      return
    }

    const scale = Math.max(width / naturalWidth, height / naturalHeight)
    const scaledWidth = naturalWidth * scale
    const scaledHeight = naturalHeight * scale
    const offsetX = x + (width - scaledWidth) / 2
    const offsetY = y + (height - scaledHeight) / 2

    context.save()
    context.beginPath()
    context.rect(x, y, width, height)
    context.clip()
    context.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight)
    context.restore()
  }

  drawCover(leftImage, 0, 0, size / 2, size)
  drawCover(rightImage, size / 2, 0, size / 2, size)
  context.fillStyle = 'rgba(15, 23, 42, 0.38)'
  context.fillRect(size / 2 - 1, 0, 2, size)

  return canvas.toDataURL('image/png')
}

const ensureSplitTexture = (leftUrl: string, rightUrl: string): Promise<string> => {
  const cacheKey = `${leftUrl}|${rightUrl}`
  if (splitTextureCache.has(cacheKey)) {
    return Promise.resolve(splitTextureCache.get(cacheKey) as string)
  }

  const existing = splitTexturePromiseCache.get(cacheKey)
  if (existing) {
    return existing
  }

  const promise = createSplitTexture(leftUrl, rightUrl)
    .then((dataUrl) => {
      splitTextureCache.set(cacheKey, dataUrl)
      splitTexturePromiseCache.delete(cacheKey)
      return dataUrl
    })
    .catch((error) => {
      splitTexturePromiseCache.delete(cacheKey)
      throw error
    })

  splitTexturePromiseCache.set(cacheKey, promise)
  return promise
}

const generateSplitTexture = (territoryId: string, key: string, leftUrl: string, rightUrl: string) => {
  if (!territoryId) {
    return
  }

  territoryTextureKeys.value = {
    ...territoryTextureKeys.value,
    [territoryId]: key
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    territoryTextures.value = {
      ...territoryTextures.value,
      [territoryId]: leftUrl
    }
    return
  }

  splitTextureGenerationCounter += 1
  const token = splitTextureGenerationCounter
  pendingSplitTextureTokens.set(territoryId, token)

  ensureSplitTexture(leftUrl, rightUrl)
    .then((dataUrl) => {
      if (pendingSplitTextureTokens.get(territoryId) !== token) {
        return
      }
      territoryTextures.value = {
        ...territoryTextures.value,
        [territoryId]: dataUrl
      }
      pendingSplitTextureTokens.delete(territoryId)
    })
    .catch(() => {
      if (pendingSplitTextureTokens.get(territoryId) !== token) {
        return
      }
      territoryTextures.value = {
        ...territoryTextures.value,
        [territoryId]: leftUrl
      }
      pendingSplitTextureTokens.delete(territoryId)
    })
}

const syncTerritoryTextures = () => {
  const descriptors = territoryTextureDescriptors.value
  const seen = new Set<string>()

  descriptors.forEach((descriptor) => {
    const territoryId = descriptor.territoryId
    if (!territoryId) {
      return
    }
    seen.add(territoryId)

    const { owner, attacker, isUnderAttack } = descriptor

    if (isUnderAttack) {
      const defenderSource =
        owner.avatar ??
        owner.colorTexture ??
        (owner.color
          ? getSolidColorTexture(owner.color)
          : getSolidColorTexture(DEFAULT_DEFENDER_TEXTURE_COLOR)) ??
        getSolidColorTexture(DEFAULT_DEFENDER_TEXTURE_COLOR)

      const attackerSource =
        attacker.avatar ??
        attacker.colorTexture ??
        (attacker.color
          ? getSolidColorTexture(attacker.color)
          : getSolidColorTexture(DEFAULT_ATTACKER_TEXTURE_COLOR)) ??
        getSolidColorTexture(DEFAULT_ATTACKER_TEXTURE_COLOR)

      if (!defenderSource || !attackerSource) {
        if (territoryTextureKeys.value[territoryId]) {
          const { [territoryId]: _removedKey, ...restKeys } = territoryTextureKeys.value
          territoryTextureKeys.value = restKeys
        }
        if (territoryTextures.value[territoryId]) {
          const { [territoryId]: _removedTexture, ...restTextures } = territoryTextures.value
          territoryTextures.value = restTextures
        }
        pendingSplitTextureTokens.delete(territoryId)
        return
      }

      const key = `split:${defenderSource}|${attackerSource}`
      if (
        territoryTextureKeys.value[territoryId] === key &&
        (territoryTextures.value[territoryId] || pendingSplitTextureTokens.has(territoryId))
      ) {
        return
      }
      generateSplitTexture(territoryId, key, defenderSource, attackerSource)
      return
    }

    if (owner.avatar) {
      const key = `single:${owner.avatar}`
      if (
        territoryTextureKeys.value[territoryId] !== key ||
        territoryTextures.value[territoryId] !== owner.avatar
      ) {
        territoryTextureKeys.value = {
          ...territoryTextureKeys.value,
          [territoryId]: key
        }
        territoryTextures.value = {
          ...territoryTextures.value,
          [territoryId]: owner.avatar
        }
      }
      pendingSplitTextureTokens.delete(territoryId)
      return
    }

    if (territoryTextureKeys.value[territoryId]) {
      const { [territoryId]: _removedKey, ...restKeys } = territoryTextureKeys.value
      territoryTextureKeys.value = restKeys
    }
    if (territoryTextures.value[territoryId]) {
      const { [territoryId]: _removedTexture, ...restTextures } = territoryTextures.value
      territoryTextures.value = restTextures
    }
    pendingSplitTextureTokens.delete(territoryId)
  })

  Object.keys(territoryTextureKeys.value).forEach((territoryId) => {
    if (!seen.has(territoryId)) {
      const { [territoryId]: _removedKey, ...restKeys } = territoryTextureKeys.value
      territoryTextureKeys.value = restKeys
    }
  })
  Object.keys(territoryTextures.value).forEach((territoryId) => {
    if (!seen.has(territoryId)) {
      const { [territoryId]: _removedTexture, ...restTextures } = territoryTextures.value
      territoryTextures.value = restTextures
    }
  })
}

watch(
  territoryTextureSignature,
  () => {
    syncTerritoryTextures()
  },
  { immediate: true }
)

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
    const ownerIdRaw = typeof territory.ownerId === 'string' ? territory.ownerId.trim() : ''
    if (!ownerIdRaw) {
      return
    }

    const ownerId = ownerIdRaw
    const owner = playerById.get(ownerId)
    const avatarUrl =
      typeof owner?.avatarUrl === 'string' && owner.avatarUrl.trim() !== ''
        ? owner.avatarUrl.trim()
        : null

    const territoryKey =
      typeof territory.id === 'string' && territory.id.trim() !== '' ? territory.id.trim() : null

    const descriptor =
      territoryKey ? territoryTextureDescriptorLookup.value.get(territoryKey) ?? null : null

    const textureSource =
      (territoryKey && territoryTextures.value[territoryKey]) ||
      descriptor?.owner.avatar ||
      avatarUrl

    if (!textureSource) {
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

      const meshBaseId = territoryKey ?? (feature.properties?.id ?? 'unknown')
      meshes.push({
        id: `${meshBaseId}:${ownerId}:${polygonIndex}`,
        mesh: {
          attributes: {
            POSITION: { size: 3, value: positions },
            TEXCOORD_0: { size: 2, value: texCoords }
          },
          indices: { size: 1, value: indexArray }
        },
        texture: textureSource
      })
    })
  })

  return meshes
})

const attackableTargetSet = computed<Set<string>>(() => {
  if (!Array.isArray(props.attackableTerritoryIds)) {
    return new Set()
  }

  const normalized = props.attackableTerritoryIds
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value): value is string => Boolean(value))

  return new Set(normalized)
})

const attackableFeatures = computed<LobbyTerritoryFeature[]>(() => {
  if (!attackableTargetSet.value.size) {
    return []
  }

  const unique = new Map<string, LobbyTerritoryFeature>()

  attackableTargetSet.value.forEach((territoryId) => {
    const feature = resolveTerritoryFeature(territoryId)
    const key = feature?.properties?.id
    if (feature && key && !unique.has(key)) {
      unique.set(key, feature)
    }
  })

  return Array.from(unique.values())
})

const attackableFeatureCollection = computed<LobbyTerritoryCollection>(() => ({
  type: 'FeatureCollection',
  features: attackableFeatures.value
}))

const underAttackTerritorySet = computed<Set<string>>(() => {
  const set = new Set<string>()
  props.territories.forEach((territory) => {
    if (territory?.id && Boolean(territory.isUnderAttack)) {
      set.add(String(territory.id))
    }
  })
  return set
})

const underAttackFeatures = computed<LobbyTerritoryFeature[]>(() => {
  if (!underAttackTerritorySet.value.size) {
    return []
  }
  const unique = new Map<string, LobbyTerritoryFeature>()

  underAttackTerritorySet.value.forEach((territoryId) => {
    const feature = resolveTerritoryFeature(territoryId)
    const key = feature?.properties?.id
    if (feature && key && !unique.has(key)) {
      unique.set(key, feature)
    }
  })

  return Array.from(unique.values())
})

const underAttackFeatureCollection = computed<LobbyTerritoryCollection>(() => ({
  type: 'FeatureCollection',
  features: underAttackFeatures.value
}))

const attackHighlightPhase = ref(0)
let attackHighlightTimer: number | null = null

const startAttackHighlight = () => {
  if (attackHighlightTimer !== null) {
    return
  }
  if (typeof window === 'undefined') {
    return
  }
  attackHighlightTimer = window.setInterval(() => {
    attackHighlightPhase.value = (attackHighlightPhase.value + 1) % 2
  }, 520)
}

const stopAttackHighlight = () => {
  if (attackHighlightTimer === null) return
  if (typeof window !== 'undefined') {
    window.clearInterval(attackHighlightTimer)
  }
  attackHighlightTimer = null
  attackHighlightPhase.value = 0
}

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

const createFillLayer = () =>
  new GeoJsonLayer<any>({
    id: 'lobby-territories-fill',
    data: featureCollection,
    pickable: !props.disableInteraction,
    stroked: false,
    filled: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 140],
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
      getFillColor: colorTrigger.value
    }
  })

const createBorderLayer = () =>
  new GeoJsonLayer<any>({
    id: 'lobby-territories-borders',
    data: featureCollection,
    pickable: false,
    stroked: true,
    filled: false,
    autoHighlight: false,
    lineWidthUnits: 'pixels',
    lineWidthMinPixels: 2.2,
    lineWidthMaxPixels: 6,
    getLineColor: (feature: any) => computeLineColor(feature as DeckFeature),
    parameters: {
      depthTest: false
    } as Record<string, unknown>,
    updateTriggers: {
      getLineColor: colorTrigger.value
    }
  })

const createAttackHighlightLayer = () =>
  new GeoJsonLayer<any>({
    id: 'attackable-territories-highlight',
    data: attackableFeatureCollection.value,
    pickable: false,
    stroked: true,
    filled: true,
    autoHighlight: false,
    lineWidthUnits: 'pixels',
    lineWidthMinPixels: 3,
    getLineColor: () =>
      attackHighlightPhase.value === 0
        ? ATTACK_TARGET_BORDER_COLOR_PRIMARY
        : ATTACK_TARGET_BORDER_COLOR_SECONDARY,
    getFillColor: () =>
      attackHighlightPhase.value === 0
        ? ATTACK_TARGET_FILL_COLOR_PRIMARY
        : ATTACK_TARGET_FILL_COLOR_SECONDARY,
    parameters: {
      depthTest: false
    } as Record<string, unknown>,
    updateTriggers: {
      getLineColor: attackHighlightPhase.value,
      getFillColor: attackHighlightPhase.value
    }
  })

const createUnderAttackLayer = () =>
  new GeoJsonLayer<any>({
    id: 'under-attack-territories-highlight',
    data: underAttackFeatureCollection.value,
    pickable: false,
    stroked: true,
    filled: true,
    autoHighlight: false,
    lineWidthUnits: 'pixels',
    lineWidthMinPixels: 3.5,
    getLineColor: () => UNDER_ATTACK_BORDER_COLOR_SECONDARY,
    getFillColor: () => UNDER_ATTACK_FILL_COLOR,
    parameters: {
      depthTest: false
    } as Record<string, unknown>
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
  const baseLayers: any[] = [createFillLayer()]
  if (territoryAvatarMeshes.value.length > 0) {
    baseLayers.push(...createAvatarMeshLayers())
  }
  baseLayers.push(createBorderLayer())
  if (attackableFeatures.value.length > 0) {
    baseLayers.push(createAttackHighlightLayer())
  }
  if (underAttackFeatures.value.length > 0) {
    baseLayers.push(createUnderAttackLayer())
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
  () => attackableFeatures.value.length,
  (count) => {
    if (count > 0) {
      startAttackHighlight()
    } else {
      stopAttackHighlight()
    }
    if (deckInstance) {
      deckInstance.setProps({
        layers: layers.value
      })
    }
  },
  { immediate: true }
)

watch(attackHighlightPhase, () => {
  if (!deckInstance) return
  deckInstance.setProps({
    layers: layers.value
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
  stopAttackHighlight()
  pendingSplitTextureTokens.clear()
  splitTexturePromiseCache.clear()
  splitTextureCache.clear()
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
