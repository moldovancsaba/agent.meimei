/**
 * Database Utilities and Middleware for ChangeMass
 * 
 * Provides standardized database operations, middleware functions, and utilities
 * that can be reused across all API routes to ensure consistency and reduce
 * code duplication.
 * 
 * Features:
 * - withDatabase middleware for automatic connection handling
 * - Standardized response formatters for success and error cases
 * - Request validation helpers with comprehensive TypeScript types
 * - Database operation wrappers with built-in error handling
 * - Logging utilities with structured output
 * - Health check and monitoring utilities
 */

import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase, { isConnected, getConnectionMetrics } from './mongodb'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Standard API response format for consistent client-side handling
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
  timestamp?: string;
  requestId?: string;
}

/**
 * Extended API response with pagination information
 */
export interface PaginatedApiResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Database operation context for logging and monitoring
 */
export interface DatabaseOperationContext {
  operation: string;
  collection?: string;
  userId?: string;
  requestId: string;
  startTime: number;
}

/**
 * Request validation configuration
 */
export interface ValidationConfig {
  requireAuth?: boolean;
  requiredFields?: string[];
  optionalFields?: string[];
  maxBodySize?: number;
  allowedMethods?: string[];
}

/**
 * Database middleware configuration
 */
export interface DatabaseMiddlewareConfig {
  autoConnect?: boolean;
  requireConnection?: boolean;
  logQueries?: boolean;
  enableMetrics?: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generates a unique request ID for tracking and logging
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Gets current timestamp in ISO format for consistent logging
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Creates a database operation context for monitoring and logging
 */
export function createOperationContext(
  operation: string,
  collection?: string,
  userId?: string
): DatabaseOperationContext {
  return {
    operation,
    collection,
    userId,
    requestId: generateRequestId(),
    startTime: Date.now()
  }
}

/**
 * Logs the completion of a database operation with performance metrics
 */
export function logOperationCompletion(
  context: DatabaseOperationContext,
  success: boolean,
  error?: Error,
  recordCount?: number
): void {
  const duration = Date.now() - context.startTime
  const status = success ? '✅' : '❌'
  
  console.log(
    `${status} [DB:${context.collection || 'unknown'}] ${context.operation} ` +
    `(${duration}ms) [${context.requestId}]`
  )
  
  if (recordCount !== undefined) {
    console.log(`📊 [DB] Records affected: ${recordCount}`)
  }
  
  if (error && !success) {
    console.error(`🔍 [DB] Error details:`, error.message)
  }
}

// ============================================================================
// RESPONSE FORMATTERS
// ============================================================================

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    statusCode,
    timestamp: getCurrentTimestamp()
  }
  
  return NextResponse.json(response, { status: statusCode })
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: string,
  statusCode: number = 500,
  details?: any
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error,
    statusCode,
    timestamp: getCurrentTimestamp(),
    ...(details && { details })
  }
  
  console.error(`🚨 [API] Error response (${statusCode}):`, error)
  if (details) {
    console.error(`🔍 [API] Error details:`, details)
  }
  
  return NextResponse.json(response, { status: statusCode })
}

/**
 * Creates a standardized paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginatedApiResponse<T>['pagination'],
  message?: string
): NextResponse {
  const response: PaginatedApiResponse<T> = {
    success: true,
    data,
    pagination,
    message,
    statusCode: 200,
    timestamp: getCurrentTimestamp()
  }
  
  return NextResponse.json(response, { status: 200 })
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

/**
 * Validates incoming request data against configuration
 */
export async function validateRequest(
  request: NextRequest,
  config: ValidationConfig
): Promise<{ isValid: boolean; error?: string; data?: any }> {
  try {
    // Check HTTP method
    if (config.allowedMethods && !config.allowedMethods.includes(request.method)) {
      return {
        isValid: false,
        error: `Method ${request.method} not allowed. Allowed methods: ${config.allowedMethods.join(', ')}`
      }
    }
    
    // Parse request body for POST/PUT/PATCH requests
    let data: any = {}
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const body = await request.text()
        
        // Check body size
        if (config.maxBodySize && body.length > config.maxBodySize) {
          return {
            isValid: false,
            error: `Request body too large. Maximum size: ${config.maxBodySize} bytes`
          }
        }
        
        // Parse JSON
        if (body) {
          data = JSON.parse(body)
        }
      } catch (parseError) {
        return {
          isValid: false,
          error: 'Invalid JSON in request body'
        }
      }
    }
    
    // Check required fields
    if (config.requiredFields) {
      for (const field of config.requiredFields) {
        if (!(field in data) || data[field] === null || data[field] === undefined) {
          return {
            isValid: false,
            error: `Missing required field: ${field}`
          }
        }
      }
    }
    
    return { isValid: true, data }
    
  } catch (error) {
    return {
      isValid: false,
      error: `Request validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Extracts and validates pagination parameters from request URL
 */
export function extractPaginationParams(request: NextRequest): {
  page: number;
  limit: number;
  skip: number;
  sortBy?: string;
  sortOrder: 1 | -1;
} {
  const { searchParams } = new URL(request.url)
  
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
  const skip = (page - 1) * limit
  const sortBy = searchParams.get('sortBy') || undefined
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1
  
  return { page, limit, skip, sortBy, sortOrder }
}

/**
 * Extracts filter parameters from request URL
 */
export function extractFilterParams(request: NextRequest): Record<string, any> {
  const { searchParams } = new URL(request.url)
  const filters: Record<string, any> = {}
  
  // Common filter parameters
  const search = searchParams.get('search')
  const category = searchParams.get('category')
  const tags = searchParams.get('tags')?.split(',').filter(Boolean)
  const isFavorite = searchParams.get('favorite') === 'true'
  const isActive = searchParams.get('active')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  
  if (search) filters.search = search
  if (category) filters.category = category
  if (tags && tags.length > 0) filters.tags = tags
  if (searchParams.has('favorite')) filters.isFavorite = isFavorite
  if (isActive !== null) filters.isActive = isActive === 'true'
  if (dateFrom) filters.dateFrom = new Date(dateFrom)
  if (dateTo) filters.dateTo = new Date(dateTo)
  
  return filters
}

// ============================================================================
// DATABASE MIDDLEWARE
// ============================================================================

/**
 * Higher-order function that wraps API handlers with database connection management
 * 
 * Automatically handles:
 * - Database connection establishment
 * - Error handling and standardized responses
 * - Request logging and metrics
 * - Connection status verification
 * 
 * @param handler - The API route handler function
 * @param config - Configuration options for the middleware
 * @returns Wrapped handler with database connection management
 */
export function withDatabase<T = any>(
  handler: (request: NextRequest, context: { params?: any; requestId?: string }) => Promise<NextResponse>,
  config: DatabaseMiddlewareConfig = {}
): (request: NextRequest, context: { params?: any }) => Promise<NextResponse> {
  
  const {
    autoConnect = true,
    requireConnection = true,
    logQueries = true,
    enableMetrics = true
  } = config
  
  return async (request: NextRequest, context: { params?: any } = {}) => {
    const requestId = generateRequestId()
    const startTime = Date.now()
    
    if (logQueries) {
      console.log(`🔍 [API] ${request.method} ${request.url} [${requestId}]`)
    }
    
    try {
      // Establish database connection if required
      if (autoConnect) {
        if (logQueries) {
          console.log(`🔗 [DB] Ensuring connection... [${requestId}]`)
        }
        
        await connectToDatabase()
        
        if (requireConnection && !isConnected()) {
          console.error(`❌ [DB] Connection not available [${requestId}]`)
          return createErrorResponse(
            'Database connection not available',
            503
          )
        }
      }
      
      // Execute the handler
      const response = await handler(request, { ...context, requestId })
      
      // Log successful completion
      if (logQueries) {
        const duration = Date.now() - startTime
        console.log(`✅ [API] Completed ${request.method} ${request.url} (${duration}ms) [${requestId}]`)
      }
      
      return response
      
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ [API] Failed ${request.method} ${request.url} (${duration}ms) [${requestId}]:`, error)
      
      // Return standardized error response
      if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes('validation')) {
          return createErrorResponse('Invalid request data', 400, error.message)
        } else if (error.message.includes('not found')) {
          return createErrorResponse('Resource not found', 404)
        } else if (error.message.includes('unauthorized')) {
          return createErrorResponse('Unauthorized', 401)
        } else if (error.message.includes('MongoDB')) {
          return createErrorResponse('Database operation failed', 503)
        }
        
        return createErrorResponse(
          'Internal server error',
          500,
          process.env.NODE_ENV === 'development' ? error.message : undefined
        )
      }
      
      return createErrorResponse('Unknown error occurred', 500)
    }
  }
}

// ============================================================================
// HEALTH CHECK UTILITIES
// ============================================================================

/**
 * Performs comprehensive health check of database connection
 */
export async function performHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy' | 'degraded';
  database: {
    connected: boolean;
    responseTime?: number;
    error?: string;
    metrics?: any;
  };
  timestamp: string;
}> {
  const startTime = Date.now()
  
  try {
    // Check connection status
    const connected = isConnected()
    const responseTime = Date.now() - startTime
    const metrics = getConnectionMetrics()
    
    return {
      status: connected ? 'healthy' : 'unhealthy',
      database: {
        connected,
        responseTime,
        metrics
      },
      timestamp: getCurrentTimestamp()
    }
    
  } catch (error) {
    return {
      status: 'unhealthy',
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: getCurrentTimestamp()
    }
  }
}

/**
 * Creates a simple health check endpoint handler
 */
export function createHealthCheckHandler() {
  return withDatabase(async (request: NextRequest) => {
    const health = await performHealthCheck()
    
    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 : 503
    })
  }, {
    requireConnection: false, // Don't fail if connection is down
    logQueries: false // Don't spam logs with health checks
  })
}

// ============================================================================
// EXPORTS
// ============================================================================

// All functions and types are already exported inline above
// No need for additional export block to avoid redeclaration errors
