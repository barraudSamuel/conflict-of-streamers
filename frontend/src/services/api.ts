/**
 * API Client Service
 * Handles REST API communication with backend
 */

import type { CreateRoomRequest, CreateRoomResponse, RoomExistsResponse, JoinRoomRequest, JoinRoomResponse } from 'shared/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    let response: Response
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      })
    } catch {
      throw new Error('Impossible de contacter le serveur. Vérifiez votre connexion.')
    }

    let data: unknown
    try {
      data = await response.json()
    } catch {
      throw new Error('Réponse invalide du serveur')
    }

    if (!response.ok) {
      const apiError = data as ApiError
      throw new Error(apiError.error?.message || 'Une erreur est survenue')
    }

    return data as T
  }

  async createRoom(request: CreateRoomRequest): Promise<CreateRoomResponse> {
    return this.request<CreateRoomResponse>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  async checkRoomExists(roomCode: string): Promise<boolean> {
    const response = await this.request<RoomExistsResponse>(
      `/api/rooms/${encodeURIComponent(roomCode)}/exists`
    )
    return response.exists
  }

  async joinRoom(roomCode: string, request: JoinRoomRequest): Promise<JoinRoomResponse> {
    return this.request<JoinRoomResponse>(
      `/api/rooms/${encodeURIComponent(roomCode)}/join`,
      {
        method: 'POST',
        body: JSON.stringify(request)
      }
    )
  }
}

export const api = new ApiClient(API_BASE_URL)
