export const ERROR_CODES = {
  EDGE: {
    VALIDATION_ERROR: 'EDGE_VALIDATION_ERROR',
    INVALID_REQUEST: 'EDGE_INVALID_REQUEST',
    SERVICE_UNAVAILABLE: 'EDGE_SERVICE_UNAVAILABLE',
    INTERNAL_ERROR: 'EDGE_INTERNAL_ERROR',
    DOMAIN_UNAVAILABLE: 'EDGE_DOMAIN_UNAVAILABLE',
    UNAUTHORIZED: 'EDGE_UNAUTHORIZED',
    FORBIDDEN: 'EDGE_FORBIDDEN',
    NOT_FOUND: 'EDGE_NOT_FOUND',
    RATE_LIMITED: 'EDGE_RATE_LIMITED',
    AUTHENTICATION_ERROR: 'EDGE_AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'EDGE_AUTHORIZATION_ERROR'
  },
  DOMAIN: {
    CONNECTION_ERROR: 'DOMAIN_CONNECTION_ERROR',
    TIMEOUT: 'DOMAIN_TIMEOUT',
    INVALID_RESPONSE: 'DOMAIN_INVALID_RESPONSE'
  },
  TODO: {
    NEEDS_SPECIFIC_CODE: 'TODO_NEEDS_SPECIFIC_CODE',
    NOT_IMPLEMENTED: 'TODO_NOT_IMPLEMENTED',
    TEMPORARY_ERROR: 'TODO_TEMPORARY_ERROR'
  }
};

// Helper type for TODO errors that should be replaced
export type TodoErrorCode = typeof ERROR_CODES.TODO[keyof typeof ERROR_CODES.TODO];