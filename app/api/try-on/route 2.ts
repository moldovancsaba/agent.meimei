/**
 * Try-On API Route
 * 
 * Server-side handler for virtual outfit try-on processing.
 * Uses LightX API to generate AI try-on results.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Person, ClothingItem } from '@/app/types/models'

// Ensure Node.js runtime (required for process.env)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Types for request body
interface TryOnRequestBody {
  person: Person
  clothing: ClothingItem
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json() as TryOnRequestBody
    const { person, clothing } = body
    
    if (!person?.imageUrl || !clothing?.imageUrl) {
      return NextResponse.json(
        { error: 'Both person and clothing images are required' },
        { status: 400 }
      )
    }
    
    // Check if we have LightX URLs
    if (!clothing.lightxUrl || !person.lightxUrl) {
      const missingItems = []
      if (!clothing.lightxUrl) missingItems.push(`clothing "${clothing.name}"`)
      if (!person.lightxUrl) missingItems.push(`person "${person.name}"`)
      
      return NextResponse.json(
        {
          error: `Missing LightX URLs: ${missingItems.join(' and ')} ${missingItems.length === 1 ? 'requires' : 'require'} re-upload.`,
          details: {
            items: missingItems,
            tip: 'Please re-upload these items to enable AI try-on functionality.'
          }
        },
        { status: 400 }
      )
    }

    console.log('🎭 Starting try-on generation...')
    console.log('🧑 Person:', person.name)
    console.log('👕 Clothing:', clothing.name)
    
    // Generate try-on image
    const result = await generateVirtualTryOn(
      person.lightxUrl!,
      clothing.lightxUrl!,
      { 
        quality: 'medium',
        preserveFace: true
      }
    )
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Try-on generation failed:', error)
    
    let errorMessage = 'Failed to generate virtual try-on'
    let statusCode = 500
    
    if (error instanceof Error) {
      errorMessage = error.message.includes('LIGHTX_API_KEY')
        ? 'Missing or invalid API configuration'
        : error.message
      
      if (error.message.includes('not uploaded to LightX CDN')) {
        statusCode = 400
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
