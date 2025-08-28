/**
 * Environment Variables Diagnostic API Route
 * 
 * Checks and validates the environment variables configuration.
 * This is only for development use.
 */

import { NextRequest, NextResponse } from 'next/server'

// Ensure Node.js runtime (required for process.env)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const envStatus = {
      LIGHTX_API_KEY: {
        exists: !!process.env.LIGHTX_API_KEY,
        length: process.env.LIGHTX_API_KEY?.length || 0,
        firstChar: process.env.LIGHTX_API_KEY?.[0] || null,
        lastChar: process.env.LIGHTX_API_KEY?.[process.env.LIGHTX_API_KEY.length - 1] || null
      },
      NODE_ENV: process.env.NODE_ENV,
      pwd: process.cwd(),
      envKeys: Object.keys(process.env).filter(key => 
        ['LIGHTX_API_KEY', 'IMGBB_API_KEY', 'MONGODB_URI', 'NODE_ENV'].includes(key)
      )
    }

    return NextResponse.json(envStatus)

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to check environment variables',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
