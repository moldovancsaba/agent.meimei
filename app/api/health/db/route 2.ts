/**
 * Database Health Check API Endpoint
 * 
 * Provides detailed MongoDB connection health and diagnostics.
 * Uses the new database utilities for comprehensive monitoring.
 * 
 * GET /api/health/db - Returns database-specific health information
 */

import { NextRequest } from 'next/server'
import { performHealthCheck, createSuccessResponse, createErrorResponse } from '../../../lib/database-utils'
import { getConnectionMetrics } from '../../../lib/mongodb'

/**
 * GET /api/health/db
 * 
 * Returns comprehensive database health check information
 * Uses the new database utilities for consistent error handling
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('🔍 [DB Health] Starting database health check')
    
    // Perform comprehensive health check using new utilities
    const dbHealth = await performHealthCheck()
    
    // Get detailed connection metrics
    const metrics = getConnectionMetrics()
    
    // Calculate response time
    const responseTime = Date.now() - startTime
    
    // Build comprehensive response
    const healthData = {
      ...dbHealth,
      performance: {
        healthCheckDuration: responseTime,
        averageResponseTime: metrics.lastConnectionTime 
          ? Date.now() - metrics.lastConnectionTime.getTime() 
          : null
      },
      connection: {
        attempts: metrics.connectionAttempts,
        successful: metrics.successfulConnections,
        failed: metrics.failedConnections,
        retryCount: metrics.retryCount,
        uptime: metrics.uptime,
        currentStatus: metrics.currentStatus
      },
      environment: {
        mongodbUri: !!process.env.MONGODB_URI,
        nodeEnv: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.1.0'
      }
    }
    
    console.log(`✅ [DB Health] Check completed: ${dbHealth.status} (${responseTime}ms)`)
    
    // Return success response with appropriate status code
    const statusCode = dbHealth.status === 'healthy' ? 200 : 503
    
    return createSuccessResponse(
      healthData,
      `Database health check completed: ${dbHealth.status}`,
      statusCode
    )
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('❌ [DB Health] Health check failed:', error)
    
    return createErrorResponse(
      'Database health check failed',
      503,
      {
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    )
  }
}

/**
 * OPTIONS /api/health/db
 * 
 * CORS preflight handler for database health endpoint
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })
}
