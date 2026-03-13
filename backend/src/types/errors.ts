export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL'

export class AppError extends Error {
  status: number
  code: ErrorCode
  detail?: unknown

  constructor(status: number, code: ErrorCode, message: string, detail?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.detail = detail
  }
}

export const Err = {
  badRequest: (msg = 'bad request', detail?: unknown) =>
    new AppError(400, 'BAD_REQUEST', msg, detail),
  unauthorized: (msg = 'unauthorized', detail?: unknown) =>
    new AppError(401, 'UNAUTHORIZED', msg, detail),
  forbidden: (msg = 'forbidden', detail?: unknown) => new AppError(403, 'FORBIDDEN', msg, detail),
  notFound: (msg = 'not found', detail?: unknown) => new AppError(404, 'NOT_FOUND', msg, detail),
  conflict: (msg = 'conflict', detail?: unknown) => new AppError(409, 'CONFLICT', msg, detail),
  internal: (msg = 'internal error', detail?: unknown) =>
    new AppError(500, 'INTERNAL', msg, detail),
} as const
