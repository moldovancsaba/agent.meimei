/**
 * Health Check API Endpoint
 * 
 * Provides system health status including database connectivity,
 * environment configuration, and service availability checks.
 * 
 * GET /api/health - Returns comprehensive health status
 */

import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase, { isConnected, getDatabase } from '../../lib/mongodb'

// Interface for health check response
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'error'
      message: string
      details?: {
        host?: string
        database?: string
        collections?: number
      }
    }
    environment: {
      status: 'configured' | 'missing_vars'
      message: string
      vars: {
        mongodb_uri: boolean
        lightx_api_key: boolean
        imgbb_api_key: boolean
        next_public_app_url: boolean
      }
    }
    apis: {
      status: 'available' | 'unavailable' | 'not_tested'
      message: string
    }
  }
  uptime: number
}

/**
 * GET /api/health
 * 
 * Returns comprehensive health check information
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  
  try {
    console.log('🔍 Starting health check...')
    
    // Initialize health status
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: {
          status: 'disconnected',
          message: 'Not tested'
        },
        environment: {
          status: 'configured',
          message: 'All variables configured',
          vars: {
            mongodb_uri: !!process.env.MONGODB_URI,
            lightx_api_key: !!process.env.LIGHTX_API_KEY,
            imgbb_api_key: !!process.env.IMGBB_API_KEY,
            next_public_app_url: !!process.env.NEXT_PUBLIC_APP_URL,
          }
        },
        apis: {
          status: 'not_tested',
          message: 'External API connectivity not tested'
        }
      },
      uptime: process.uptime() * 1000 // Convert to milliseconds
    }

    // 1. Check environment variables
    console.log('🔧 Checking environment variables...')
    const missingVars = []
    
    if (!process.env.MONGODB_URI) missingVars.push('MONGODB_URI')
    if (!process.env.LIGHTX_API_KEY) missingVars.push('LIGHTX_API_KEY')
    if (!process.env.IMGBB_API_KEY) missingVars.push('IMGBB_API_KEY')
    if (!process.env.NEXT_PUBLIC_APP_URL) missingVars.push('NEXT_PUBLIC_APP_URL')
    
    if (missingVars.length > 0) {
      health.services.environment.status = 'missing_vars'
      health.services.environment.message = `Missing: ${missingVars.join(', ')}`
      health.status = 'degraded'
    }

    // 2. Check database connectivity
    console.log('🗄️ Checking database connection...')
    try {
      await connectToDatabase()
      
      if (isConnected()) {
        const db = getDatabase()
        health.services.database.status = 'connected'
        health.services.database.message = 'Successfully connected to MongoDB Atlas'
        
        if (db && db.db) {
          health.services.database.details = {
            host: db.host,
            database: db.name,
            collections: await db.db.listCollections().toArray().then(cols => cols.length)
          }
        }
      } else {
        health.services.database.status = 'disconnected'
        health.services.database.message = 'Database connection failed'
        health.status = 'unhealthy'
      }
    } catch (dbError) {
      console.error('❌ Database health check failed:', dbError)
      health.services.database.status = 'error'
      health.services.database.message = dbError instanceof Error ? dbError.message : 'Unknown database error'
      health.status = 'unhealthy'
    }

    // 3. Quick API availability check (lightweight)
    console.log('🌐 Checking API configurations...')
    if (health.services.environment.vars.lightx_api_key && health.services.environment.vars.imgbb_api_key) {
      health.services.apis.status = 'available'
      health.services.apis.message = 'API keys configured and ready for use'
    } else {
      health.services.apis.status = 'unavailable'
      health.services.apis.message = 'API keys not properly configured'
      if (health.status === 'healthy') health.status = 'degraded'
    }

    // Log overall health status
    const responseTime = Date.now() - startTime
    console.log(`✅ Health check completed in ${responseTime}ms - Status: ${health.status}`)

    // Return health status with appropriate HTTP status code
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503
    
    return NextResponse.json(health, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })

  } catch (error) {
    console.error('💥 Health check endpoint error:', error)
    
    // Return error response
    const errorHealth: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: {
          status: 'error',
          message: 'Health check failed'
        },
        environment: {
          status: 'missing_vars',
          message: 'Unable to check environment',
          vars: {
            mongodb_uri: false,
            lightx_api_key: false,
            imgbb_api_key: false,
            next_public_app_url: false,
          }
        },
        apis: {
          status: 'unavailable',
          message: 'Unable to check API status'
        }
      },
      uptime: process.uptime() * 1000
    }

    return NextResponse.json(
      { 
        ...errorHealth, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    )
  }
}

/**
 * OPTIONS /api/health
 * 
 * CORS preflight handler
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
