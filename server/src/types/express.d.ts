declare namespace Express {
  export interface Request {
    userId?: string
    /** Corrélation HTTP (header `x-request-id` ou UUID généré). */
    requestId?: string
  }
}