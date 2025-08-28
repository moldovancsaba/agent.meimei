/**
 * Try-On API Route
 * 
 * Server-side handler for virtual outfit try-on processing.
 * Uses Replicate AI to generate reliable try-on results.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Person, ClothingItem } from '@/app/types/models'
import { generateVirtualTryOn } from '@/app/lib/api/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import TryOnGeneration from '@/app/lib/models/TryOnGeneration'

// Ensure Node.js runtime (required for process.env)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Types for request body
interface TryOnRequestBody {
  person: Person
  clothing: ClothingItem
}

export async function POST(req: NextRequest) {
  let generationRecord: any = null
  
  try {
    await connectToDatabase()
    
    // Parse request body
    const body = await req.json() as TryOnRequestBody
    const { person, clothing } = body
    
    if (!person?.imageUrl || !clothing?.imageUrl) {
      return NextResponse.json(
        { error: 'Both person and clothing images are required' },
        { status: 400 }
      )
    }
    
    if (!person._id || !clothing._id) {
      return NextResponse.json(
        { error: 'Person and clothing IDs are required' },
        { status: 400 }
      )
    }
    
    console.log('🔄 Starting Replicate try-on generation...')
    console.log('🧑 Person:', person.name)
    console.log('👕 Clothing:', clothing.name)
    
    // Create generation record in database
    generationRecord = await TryOnGeneration.create({
      person: person._id,
      clothingItem: clothing._id,
      quality: 'standard',
      style: 'realistic',
      // generatedImageUrl will be set when generation completes
      status: {
        status: 'processing',
        startedAt: new Date()
      }
    })
    
    console.log(`📝 Created generation record: ${generationRecord._id}`)
    
    // Use ImgBB URLs (reliable and accessible)
    const personImageUrl = person.imageUrl // Always use ImgBB URL
    const clothingImageUrl = clothing.imageUrl // Always use ImgBB URL
    
    console.log('🖼️ Using ImgBB URLs for reliable access')
    
    try {
      // Generate try-on image using Replicate
      const result = await generateVirtualTryOn(
        personImageUrl,
        clothingImageUrl,
        { 
          personName: person.name,
          clothingName: clothing.name,
          quality: 'standard',
          style: 'realistic'
        }
      )
      
      // Update generation record with results
      await TryOnGeneration.findByIdAndUpdate(generationRecord._id, {
        generatedImageUrl: result.generatedImageUrl,
        processingTimeMs: result.processingTimeMs,
        replicateResponse: {
          requestId: result.requestId,
          generatedImageUrl: result.generatedImageUrl,
          processingTimeMs: result.processingTimeMs,
          metadata: result.metadata
        },
        status: {
          status: 'completed',
          progress: 100,
          completedAt: new Date()
        }
      })
      
      console.log(`✅ Generation completed and saved: ${generationRecord._id}`)
      
      // Return result with generation ID
      return NextResponse.json({
        ...result,
        generationId: generationRecord._id
      })
      
    } catch (genError) {
      // Mark generation as failed
      if (generationRecord) {
        await TryOnGeneration.findByIdAndUpdate(generationRecord._id, {
          status: {
            status: 'failed',
            error: genError instanceof Error ? genError.message : 'Unknown error',
            completedAt: new Date()
          }
        })
      }
      throw genError
    }
    
  } catch (error) {
    console.error('❌ Try-on generation failed:', error)
    
    let errorMessage = 'Failed to generate virtual try-on'
    let statusCode = 500
    
    if (error instanceof Error) {
      // Handle common errors
      if (error.message.includes('Replicate API')) {
        errorMessage = error.message
        statusCode = 422
      } else if (error.message.includes('authentication') || error.message.includes('credentials')) {
        errorMessage = 'AI service authentication failed'
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        errorMessage = 'API quota exceeded or rate limited'
        statusCode = 429
      } else if (error.message.includes('Invalid image URLs')) {
        errorMessage = 'Invalid or inaccessible image URLs provided'
        statusCode = 400
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        generationId: generationRecord?._id
      },
      { status: statusCode }
    )
  }
}
