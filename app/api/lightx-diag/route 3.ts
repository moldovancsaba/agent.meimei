/**
 * LightX Integration Diagnostic API
 * 
 * Comprehensive diagnostic tool for LightX API integration:
 * - Tests API connectivity and authentication
 * - Checks database integration status
 * - Validates environment configuration
 * - Provides actionable error messages
 */

import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import connectToDatabase from '../../lib/mongodb'
import ClothingItem from '../../lib/models/ClothingItem'
import Person from '../../lib/models/Person'

// Ensure Node.js runtime for environment variables
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    api_connectivity: {},
    database_status: {},
    recommendations: []
  }

  try {
    // ========================================================================
    // ENVIRONMENT CHECK
    // ========================================================================
    
    console.log('🔍 [LightX-Diag] Starting comprehensive diagnostic...')
    
    const apiKey = process.env.LIGHTX_API_KEY
    results.environment = {
      has_api_key: !!apiKey,
      api_key_length: apiKey ? apiKey.length : 0,
      api_key_format: apiKey ? (apiKey.includes('_') ? 'expected_format' : 'unexpected_format') : 'missing',
      node_env: process.env.NODE_ENV,
      cwd: process.cwd()
    }

    if (!apiKey) {
      results.recommendations.push('Set LIGHTX_API_KEY in .env.local file and restart server')
      return NextResponse.json({
        success: false,
        error: 'LIGHTX_API_KEY not configured',
        results
      }, { status: 500 })
    }

    // ========================================================================
    // API CONNECTIVITY TEST
    // ========================================================================
    
    console.log('🌐 [LightX-Diag] Testing API connectivity...')
    
    try {
      // Test 1: Basic API endpoint reachability
      const connectivityTest = await axios.get('https://api.lightxeditor.com/external/api/v2/health', {
        timeout: 10000,
        headers: {
          'x-api-key': apiKey
        }
      }).catch(error => {
        // If health endpoint doesn't exist, try a basic request
        return axios.post('https://api.lightxeditor.com/external/api/v2/ai-virtual-outfit-try-on', 
          { test: true }, 
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey
            },
            validateStatus: () => true // Accept any status for testing
          }
        )
      })

      results.api_connectivity = {
        reachable: true,
        status_code: connectivityTest.status,
        response_headers: {
          'content-type': connectivityTest.headers['content-type'],
          'server': connectivityTest.headers['server'],
          'x-ratelimit-remaining': connectivityTest.headers['x-ratelimit-remaining']
        },
        response_time_ms: 'measured_by_axios'
      }

      // Check for common API issues
      if (connectivityTest.status === 401) {
        results.recommendations.push('API key appears invalid - check LIGHTX_API_KEY value')
      } else if (connectivityTest.status === 403) {
        results.recommendations.push('API access forbidden - check account permissions')
      } else if (connectivityTest.status === 429) {
        results.recommendations.push('Rate limit exceeded - wait before retrying')
      } else if (connectivityTest.status >= 500) {
        results.recommendations.push('LightX API server error - try again later')
      }

    } catch (networkError: any) {
      console.error('❌ [LightX-Diag] Network connectivity failed:', networkError)
      
      results.api_connectivity = {
        reachable: false,
        error: networkError.message,
        error_code: networkError.code,
        timeout: networkError.code === 'ECONNABORTED',
        dns_resolution: networkError.code !== 'ENOTFOUND',
        connection_refused: networkError.code === 'ECONNREFUSED'
      }

      // Specific network error recommendations
      if (networkError.code === 'ENOTFOUND') {
        results.recommendations.push('DNS resolution failed - check internet connectivity')
      } else if (networkError.code === 'ECONNREFUSED') {
        results.recommendations.push('Connection refused - LightX API may be down')
      } else if (networkError.code === 'ECONNABORTED') {
        results.recommendations.push('Request timeout - check network speed or try again')
      } else {
        results.recommendations.push('Network error - check internet connection and firewall settings')
      }
    }

    // ========================================================================
    // DATABASE STATUS CHECK
    // ========================================================================
    
    console.log('📦 [LightX-Diag] Checking database status...')
    
    try {
      await connectToDatabase()
      
      const [clothes, people] = await Promise.all([
        ClothingItem.find({ isActive: true }).select('_id name imageUrl lightxUrl').lean(),
        Person.find({ isActive: true }).select('_id name nickname imageUrl lightxUrl').lean()
      ])
      
      const clothesStatus = clothes.map(item => ({
        id: item._id,
        name: item.name,
        hasLightX: !!item.lightxUrl,
        imageUrl: item.imageUrl,
        lightxUrl: item.lightxUrl
      }))
      
      const peopleStatus = people.map(item => ({
        id: item._id,
        name: item.nickname || item.name,
        hasLightX: !!item.lightxUrl,
        imageUrl: item.imageUrl,
        lightxUrl: item.lightxUrl
      }))
      
      const clothesMissingLightX = clothesStatus.filter(item => !item.hasLightX)
      const peopleMissingLightX = peopleStatus.filter(item => !item.hasLightX)
      
      results.database_status = {
        connected: true,
        clothes: {
          total: clothes.length,
          withLightX: clothesStatus.filter(item => item.hasLightX).length,
          missing: clothesMissingLightX.length,
          missing_items: clothesMissingLightX.map(item => ({ id: item.id, name: item.name }))
        },
        people: {
          total: people.length,
          withLightX: peopleStatus.filter(item => item.hasLightX).length,
          missing: peopleMissingLightX.length,
          missing_items: peopleMissingLightX.map(item => ({ id: item.id, name: item.name }))
        }
      }

      // Recommendations based on data status
      if (clothesMissingLightX.length > 0 || peopleMissingLightX.length > 0) {
        results.recommendations.push(`${clothesMissingLightX.length + peopleMissingLightX.length} items need LightX URLs - re-upload them`)
      }
      
      if (clothes.length === 0 && people.length === 0) {
        results.recommendations.push('No data found - upload some clothes and people first')
      }
      
    } catch (dbError: any) {
      console.error('❌ [LightX-Diag] Database check failed:', dbError)
      
      results.database_status = {
        connected: false,
        error: dbError.message
      }
      
      results.recommendations.push('Database connection failed - check MongoDB configuration')
    }

    // ========================================================================
    // OVERALL STATUS
    // ========================================================================
    
    const overallSuccess = (
      results.environment.has_api_key &&
      results.api_connectivity.reachable !== false &&
      results.database_status.connected
    )

    console.log(`✅ [LightX-Diag] Diagnostic completed - Overall: ${overallSuccess ? 'SUCCESS' : 'ISSUES_FOUND'}`)
    
    return NextResponse.json({
      success: overallSuccess,
      summary: {
        environment_ok: results.environment.has_api_key,
        api_reachable: results.api_connectivity.reachable !== false,
        database_ok: results.database_status.connected,
        total_recommendations: results.recommendations.length
      },
      results
    }, { 
      status: overallSuccess ? 200 : 206 // 206 = Partial Content (some issues found)
    })
    
  } catch (error) {
    console.error('❌ [LightX-Diag] Diagnostic failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Diagnostic process failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 })
  }
}
