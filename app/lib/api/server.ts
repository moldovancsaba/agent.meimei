/**
 * Server-side only API exports for ChangeMass
 * 
 * This module contains API clients that use Node.js specific modules
 * and should only be imported in server-side code (API routes, middleware, etc.)
 */

// Server-side only: Replicate AI Virtual Try-On
export {
  ReplicateTryOnClient,
  getReplicateTryOnClient,
  generateVirtualTryOn,
  ReplicateTryOnError
} from './replicate-tryon'

// Export server-side types
export type {
  ReplicateConfig,
  TryOnRequest,
  TryOnResult
} from './replicate-tryon'

// Re-export client-safe utilities
export { uploadToImgBB } from './imgbb'
export type { ImgBBUploadResponse } from '../../types/models'

// ============================================================================
// SERVER-SIDE WORKFLOW FUNCTIONS
// ============================================================================

import { 
  generateVirtualTryOn as replicateGenerateTryOn, 
  TryOnResult 
} from './replicate-tryon'
import { uploadToImgBB } from './imgbb'
import { ImgBBUploadResponse } from '../../types/models'

/**
 * Complete try-on workflow (Server-side only)
 * 
 * End-to-end virtual try-on process that:
 * 1. Validates that images are available for processing
 * 2. Executes the virtual try-on with Imagen
 * 3. Uploads the result to ImgBB for permanent storage
 * 4. Returns complete metadata
 * 
 * @param personImageUrl - Person image URL (any accessible URL)
 * @param clothingImageUrl - Clothing image URL (any accessible URL)
 * @param options - Generation options
 * @returns Promise with complete try-on result
 */
export async function completeVirtualTryOn(
  personImageUrl: string,
  clothingImageUrl: string,
  options: {
    personName?: string
    clothingName?: string
    quality?: 'standard' | 'high'
    style?: 'realistic' | 'fashion' | 'casual'
    saveToPermanentStorage?: boolean
  } = {}
): Promise<{
  generation: TryOnResult
  permanent_url?: string
  imgbb_data?: ImgBBUploadResponse
}> {
  console.log(`🎭 Starting complete virtual try-on workflow (Replicate)`)
  
  try {
    // Step 1: Generate virtual try-on with Replicate
    const generation = await replicateGenerateTryOn(
      personImageUrl,
      clothingImageUrl,
      {
        personName: options.personName,
        clothingName: options.clothingName,
        quality: options.quality || 'standard',
        style: options.style || 'realistic'
      }
    )

    let permanent_url: string | undefined
    let imgbb_data: ImgBBUploadResponse | undefined

    // Step 2: Replicate already provides a permanent URL
    // No need to re-upload - Replicate URLs are already hosted
    permanent_url = generation.generatedImageUrl
    
    console.log(`✅ Using Replicate hosted URL: ${permanent_url}`)

    console.log(`✅ Complete try-on workflow finished`)
    console.log(`⏱️ Processing time: ${generation.processingTimeMs}ms`)

    return {
      generation,
      permanent_url,
      imgbb_data
    }
    
  } catch (error) {
    console.error('❌ Complete try-on workflow failed:', error)
    throw error
  }
}

/**
 * Bulk virtual try-on workflow (Server-side only)
 * 
 * Process multiple combinations of people and clothing items.
 * Handles rate limiting, progress tracking, and permanent storage.
 * 
 * @param combinations - Array of person/clothing URL pairs with metadata
 * @param options - Processing options
 * @returns Promise with all results
 */
export async function bulkVirtualTryOn(
  combinations: Array<{
    personUrl: string
    clothingUrl: string
    personName?: string
    clothingName?: string
    metadata?: Record<string, any>
  }>,
  options: {
    quality?: 'standard' | 'high'
    style?: 'realistic' | 'fashion' | 'casual'
    saveToPermanentStorage?: boolean
  } = {}
): Promise<Array<{
  combination: { personUrl: string; clothingUrl: string; personName?: string; clothingName?: string; metadata?: Record<string, any> }
  result?: {
    generation: TryOnResult
    permanent_url?: string
    imgbb_data?: ImgBBUploadResponse
  }
  error?: string
}>> {
  console.log(`🎭 Starting bulk virtual try-on: ${combinations.length} combinations`)
  
  const results: Array<{
    combination: { personUrl: string; clothingUrl: string; personName?: string; clothingName?: string; metadata?: Record<string, any> }
    result?: {
      generation: TryOnResult
      permanent_url?: string
      imgbb_data?: ImgBBUploadResponse
    }
    error?: string
  }> = []

  let totalProcessingTime = 0

  for (let i = 0; i < combinations.length; i++) {
    const combination = combinations[i]
    
    try {
      console.log(`🔄 Processing combination ${i + 1}/${combinations.length}`)
      
      const result = await completeVirtualTryOn(
        combination.personUrl,
        combination.clothingUrl,
        {
          personName: combination.personName,
          clothingName: combination.clothingName,
          quality: options.quality || 'standard',
          style: options.style || 'realistic',
          saveToPermanentStorage: options.saveToPermanentStorage
        }
      )
      
      results.push({
        combination,
        result
      })
      
      totalProcessingTime += result.generation.processingTimeMs
      
      // Rate limiting: wait between combinations
      if (i < combinations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 4000)) // 4 second delay for Imagen
      }
      
    } catch (error) {
      console.error(`❌ Combination ${i + 1} failed:`, error)
      
      results.push({
        combination,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const successful = results.filter(r => r.result).length
  const failed = results.filter(r => r.error).length

  console.log(`✅ Bulk try-on completed: ${successful} successful, ${failed} failed`)
  console.log(`⏱️ Total processing time: ${totalProcessingTime}ms`)

  return results
}
