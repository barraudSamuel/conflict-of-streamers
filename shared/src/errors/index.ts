// Shared custom error classes

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

/**
 * GameError - For game logic errors
 *
 * Two usage patterns:
 * 1. Generic game error (400 Bad Request):
 *    `new GameError('Something went wrong')`
 *
 * 2. Specific conflict error (409 Conflict) - use for business logic conflicts:
 *    `new GameError('PSEUDO_TAKEN', 'Ce pseudo est déjà utilisé')`
 *    `new GameError('ROOM_FULL', 'La partie est complète')`
 *    `new GameError('GAME_STARTED', 'Cette partie a déjà commencé')`
 */
export class GameError extends AppError {
  constructor(message: string, details?: unknown)
  constructor(code: string, message: string, details?: unknown)
  constructor(messageOrCode: string, messageOrDetails?: string | unknown, details?: unknown) {
    if (typeof messageOrDetails === 'string') {
      // Called with (code, message, details?) → 409 Conflict for business logic conflicts
      super(messageOrDetails, messageOrCode, 409, details)
    } else {
      // Called with (message, details?) → 400 Bad Request for generic game errors
      super(messageOrCode, 'GAME_ERROR', 400, messageOrDetails)
    }
    this.name = 'GameError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'NOT_FOUND', 404, details)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'UNAUTHORIZED', 401, details)
    this.name = 'UnauthorizedError'
  }
}
