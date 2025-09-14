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
import axios from 'axios'
import { getLightXTryOnClient } from '@/app/lib/api/lightx-tryon'
import { uploadToLightX } from '@/app/lib/api/lightx-upload'

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

    const nowIso = new Date().toISOString()
    
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

    // Helpers
    const isCoverallsCategory = (label?: string) => {
      if (!label) return false
      const v = label.trim().toLowerCase()
      const synonyms = ['coveralls','coverall','overalls','overall','jumpsuit','jump-suit','jump suit']
      return synonyms.includes(v)
    }
    const getBackendPriority = (): ('replicate'|'lightx')[] => {
      const raw = process.env.TRYON_BACKEND_PRIORITY || 'replicate,lightx'
      const list = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      const allowed: Array<'replicate'|'lightx'> = []
      for (const item of list) {
        if (item === 'replicate' || item === 'lightx') allowed.push(item)
      }
      return allowed.length ? allowed : ['replicate','lightx']
    }
    const deriveFileName = (url: string, fallback: string) => {
      try {
        const u = new URL(url)
        const base = u.pathname.split('/').pop() || fallback
        return base.includes('.') ? base : `${base}.jpg`
      } catch {
        return fallback
      }
    }
    const downloadToFile = async (url: string, fallbackName: string): Promise<File> => {
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 })
      const buffer = Buffer.from(res.data)
      const contentType = res.headers['content-type'] || 'image/jpeg'
      const name = deriveFileName(url, fallbackName)
      // Convert Buffer -> ArrayBuffer to satisfy strict DOM typings
      const ab = new ArrayBuffer(buffer.byteLength)
      new Uint8Array(ab).set(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength))
      return new File([ab], name, { type: contentType })
    }
    const ensureLightXUrl = async (existingLightxUrl: string | undefined, sourceUrl: string, fallbackName: string) => {
      if (existingLightxUrl && /^https:\/\/d3aa3s3yhl0emm\.cloudfront\.net\//.test(existingLightxUrl)) {
        return existingLightxUrl
      }
      const file = await downloadToFile(sourceUrl, fallbackName)
      const uploaded = await uploadToLightX(file)
      return uploaded.imageUrl
    }

    const priority = getBackendPriority()
    const isCoveralls = isCoverallsCategory(clothing?.category?.slug || clothing?.category?.name)

    console.log(`[try-on][${nowIso}] start person="${person.name}" clothing="${clothing.name}" isCoveralls=${isCoveralls} priority=${priority.join('>')}`)

    // Create generation record in database
    generationRecord = await TryOnGeneration.create({
      person: person._id,
      clothingItem: clothing._id,
      quality: 'standard',
      style: 'realistic',
      status: {
        status: 'processing',
        startedAt: new Date()
      }
    })
    console.log(`[try-on][${new Date().toISOString()}] created-record id=${generationRecord._id}`)

    // Prepare common URLs (ImgBB reliable baseline)
    const personImg = person.imageUrl
    const clothingImg = clothing.imageUrl

    let lastError: any = null

    // Attempt engines in configured priority
    for (const engine of priority) {
      try {
        if (engine === 'replicate') {
          const enrichedName = isCoveralls
            ? `${clothing.name} (full-body coveralls / overalls / jumpsuit one-piece)`
            : clothing.name

          console.log(`[try-on][${new Date().toISOString()}] replicate-attempt model=${process.env.REPLICATE_MODEL || 'default'} coveralls=${isCoveralls}`)

          const result = await generateVirtualTryOn(
            personImg,
            clothingImg,
            {
              personName: person.name,
              clothingName: enrichedName,
              quality: 'standard',
              style: 'realistic'
            }
          )

          await TryOnGeneration.findByIdAndUpdate(generationRecord._id, {
            generatedImageUrl: result.generatedImageUrl,
            processingTimeMs: result.processingTimeMs,
            replicateResponse: {
              predictionId: result.metadata?.replicatePredictionId,
              requestId: result.requestId,
              generatedImageUrl: result.generatedImageUrl,
              processingTimeMs: result.processingTimeMs,
              metadata: result.metadata
            },
            generationModel: result.metadata?.model,
            engine: 'replicate',
            status: {
              status: 'completed',
              progress: 100,
              completedAt: new Date()
            }
          })

          console.log(`[try-on][${new Date().toISOString()}] replicate-success id=${generationRecord._id}`)
          return NextResponse.json({
            ...result,
            generationId: generationRecord._id
          })
        }

        if (engine === 'lightx') {
          console.log(`[try-on][${new Date().toISOString()}] lightx-precheck ensure-cdn-urls`)
          const personLightx = await ensureLightXUrl(person.lightxUrl, personImg, 'person.jpg')
          const clothingLightx = await ensureLightXUrl(clothing.lightxUrl, clothingImg, 'clothing.jpg')

          const client = getLightXTryOnClient()
          console.log(`[try-on][${new Date().toISOString()}] lightx-attempt`)
          const result = await client.generateTryOn({
            personImageUrl: personLightx,
            clothingImageUrl: clothingLightx,
            quality: 'medium',
            preserveFace: true
          })

          await TryOnGeneration.findByIdAndUpdate(generationRecord._id, {
            generatedImageUrl: result.generatedImageUrl,
            processingTimeMs: result.processingTimeMs,
            lightxRequestId: result.requestId,
            lightxResponse: {
              requestId: result.requestId,
              generatedImageUrl: result.generatedImageUrl,
              processingTimeMs: result.processingTimeMs
            },
            generationModel: 'lightx-ai-virtual-tryon',
            engine: 'lightx',
            status: {
              status: 'completed',
              progress: 100,
              completedAt: new Date()
            }
          })

          console.log(`[try-on][${new Date().toISOString()}] lightx-success id=${generationRecord._id}`)
          return NextResponse.json({
            success: true,
            generatedImageUrl: result.generatedImageUrl,
            processingTimeMs: result.processingTimeMs,
            requestId: result.requestId,
            generationId: generationRecord._id
          })
        }
      } catch (engineError) {
        lastError = engineError
        console.error(`[try-on][${new Date().toISOString()}] ${engine}-error:`, engineError)
        // try next engine
      }
    }

    // If we get here, all engines failed
    if (generationRecord) {
      await TryOnGeneration.findByIdAndUpdate(generationRecord._id, {
        status: {
          status: 'failed',
          error: lastError instanceof Error ? lastError.message : 'Unknown error',
          completedAt: new Date()
        }
      })
    }

    return NextResponse.json(
      {
        error: lastError instanceof Error ? lastError.message : 'Failed to generate virtual try-on',
        generationId: generationRecord?._id
      },
      { status: 502 }
    )

  } catch (error) {
    console.error('❌ Try-on generation failed:', error)
    
    let errorMessage = 'Failed to generate virtual try-on'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.toLowerCase().includes('authentication') || error.message.toLowerCase().includes('credentials')) {
        errorMessage = 'AI service authentication failed'
      } else if (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('rate limit')) {
        errorMessage = 'API quota exceeded or rate limited'
        statusCode = 429
      } else if (error.message.toLowerCase().includes('invalid image urls')) {
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
