// Shared custom error classes
export class AppError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}
export class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', 400, details);
        this.name = 'ValidationError';
    }
}
export class GameError extends AppError {
    constructor(message, details) {
        super(message, 'GAME_ERROR', 400, details);
        this.name = 'GameError';
    }
}
export class NotFoundError extends AppError {
    constructor(message, details) {
        super(message, 'NOT_FOUND', 404, details);
        this.name = 'NotFoundError';
    }
}
export class UnauthorizedError extends AppError {
    constructor(message, details) {
        super(message, 'UNAUTHORIZED', 401, details);
        this.name = 'UnauthorizedError';
    }
}
//# sourceMappingURL=index.js.map