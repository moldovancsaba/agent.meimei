/**
 * Unified API Client for ChangeMass
 * 
 * Central hub for all external API integrations including:
 * - ImgBB CDN for image storage
 * - LightX Upload API for secure image hosting
 * - LightX Try-On API for virtual outfit processing
 * 
 * Provides unified error handling, retry logic, and abstraction layer.
 */

// Export individual clients
export {
  ImgBBClient,
  getImgBBClient,
  uploadToImgBB,
  bulkUploadToImgBB,
  ImgBBError
} from './imgbb'

export {
  LightXUploadClient,
  getLightXUploadClient,
  uploadToLightX,
  bulkUploadToLightX,
  LightXUploadError
} from './lightx-upload'

export {
  LightXTryOnClient,
  getLightXTryOnClient,
  generateVirtualTryOn,
  LightXTryOnError
} from './lightx-tryon'

// Export types
export type {
  ImgBBConfig,
  UploadOptions,
  BulkUploadResult
} from './imgbb'

export type {
  ImgBBUploadResponse
} from '../../types/models'

export type {
  LightXConfig,
  UploadResult,
  UploadProgress
} from './lightx-upload'

export type {
  LightXTryOnConfig,
  TryOnRequest,
  TryOnResult,
  ProcessingStatus
} from './lightx-tryon'

// ============================================================================
// UNIFIED API WORKFLOW FUNCTIONS
// ============================================================================

import { uploadToImgBB } from './imgbb'
import { uploadToLightX, UploadResult } from './lightx-upload'
import { generateVirtualTryOn, TryOnResult, ProcessingStatus } from './lightx-tryon'
import { ImgBBUploadResponse } from '../../types/models'

/**
 * Complete workflow: Upload image to both CDNs
 * 
 * Uploads the same image to both ImgBB (for permanent storage)
 * and LightX (for AI processing). This dual-upload strategy ensures
 * we have permanent URLs while meeting LightX processing requirements.
 * 
 * @param file - Image file to upload
 * @param name - Optional custom name
 * @returns Promise with both upload results
 */
export async function uploadToBothCDNs(
  file: File,
  name?: string
): Promise<{
  imgbb: ImgBBUploadResponse
  lightx: UploadResult
  permanent_url: string
  processing_url: string
}> {
  console.log(`🔄 Starting dual CDN upload: ${file.name}`)
  
  try {
    // Upload to both CDNs in parallel for efficiency
    const [imgbbResult, lightxResult] = await Promise.all([
      uploadToImgBB(file, name),
      uploadToLightX(file)
    ])

    console.log(`✅ Dual upload successful`)
    console.log(`📦 ImgBB (permanent): ${imgbbResult.data.url}`)
    console.log(`⚡ LightX (processing): ${lightxResult.imageUrl}`)

    return {
      imgbb: imgbbResult,
      lightx: lightxResult,
      permanent_url: imgbbResult.data.url,
      processing_url: lightxResult.imageUrl
    }
    
  } catch (error) {
    console.error('❌ Dual CDN upload failed:', error)
    throw error
  }
}

/**
 * Complete try-on workflow
 * 
 * End-to-end virtual try-on process that:
 * 1. Validates that images are available for processing
 * 2. Executes the virtual try-on
 * 3. Uploads the result to ImgBB for permanent storage
 * 4. Returns complete metadata
 * 
 * @param personLightXUrl - Person image URL from LightX CDN
 * @param clothingLightXUrl - Clothing image URL from LightX CDN
 * @param options - Generation options
 * @returns Promise with complete try-on result
 */
export async function completeVirtualTryOn(
  personLightXUrl: string,
  clothingLightXUrl: string,
  options: {
    quality?: 'low' | 'medium' | 'high'
    preserveFace?: boolean
    onProgress?: (status: ProcessingStatus) => void
    saveToPermanentStorage?: boolean
  } = {}
): Promise<{
  generation: TryOnResult
  permanent_url?: string
  imgbb_data?: ImgBBUploadResponse
}> {
  console.log(`🎭 Starting complete virtual try-on workflow`)
  
  try {
    // Step 1: Generate virtual try-on
    const generation = await generateVirtualTryOn(
      personLightXUrl,
      clothingLightXUrl,
      {
        quality: options.quality,
        preserveFace: options.preserveFace,
        onProgress: options.onProgress
      }
    )

    let permanent_url: string | undefined
    let imgbb_data: ImgBBUploadResponse | undefined

    // Step 2: Optionally save to permanent storage
    if (options.saveToPermanentStorage !== false) {
      try {
        console.log(`💾 Saving generated image to permanent storage...`)
        
        // Download generated image from LightX
        const response = await fetch(generation.generatedImageUrl)
        if (!response.ok) {
          throw new Error(`Failed to download generated image: ${response.status}`)
        }
        
        const blob = await response.blob()
        const file = new File([blob], `tryon_${Date.now()}.jpg`, { type: 'image/jpeg' })
        
        // Upload to ImgBB for permanent storage
        imgbb_data = await uploadToImgBB(file, `tryon_${generation.requestId}`)
        permanent_url = imgbb_data.data.url
        
        console.log(`✅ Generated image saved permanently: ${permanent_url}`)
        
      } catch (storageError) {
        console.warn('⚠️ Failed to save to permanent storage:', storageError)
        // Continue without permanent storage - not a critical failure
      }
    }

    console.log(`✅ Complete try-on workflow finished`)
    console.log(`💰 Credits used: ${generation.creditsUsed}`)
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
 * Bulk virtual try-on workflow
 * 
 * Process multiple combinations of people and clothing items.
 * Handles rate limiting, progress tracking, and permanent storage.
 * 
 * @param combinations - Array of person/clothing URL pairs
 * @param options - Processing options
 * @returns Promise with all results
 */
export async function bulkVirtualTryOn(
  combinations: Array<{
    personUrl: string
    clothingUrl: string
    metadata?: Record<string, any>
  }>,
  options: {
    quality?: 'low' | 'medium' | 'high'
    preserveFace?: boolean
    saveToPermanentStorage?: boolean
    onProgress?: (
      combinationIndex: number,
      status: ProcessingStatus,
      totalCombinations: number
    ) => void
  } = {}
): Promise<Array<{
  combination: { personUrl: string; clothingUrl: string; metadata?: Record<string, any> }
  result?: {
    generation: TryOnResult
    permanent_url?: string
    imgbb_data?: ImgBBUploadResponse
  }
  error?: string
}>> {
  console.log(`🎭 Starting bulk virtual try-on: ${combinations.length} combinations`)
  
  const results: Array<{
    combination: { personUrl: string; clothingUrl: string; metadata?: Record<string, any> }
    result?: {
      generation: TryOnResult
      permanent_url?: string
      imgbb_data?: ImgBBUploadResponse
    }
    error?: string
  }> = []

  let totalCreditsUsed = 0

  for (let i = 0; i < combinations.length; i++) {
    const combination = combinations[i]
    
    try {
      console.log(`🔄 Processing combination ${i + 1}/${combinations.length}`)
      
      const result = await completeVirtualTryOn(
        combination.personUrl,
        combination.clothingUrl,
        {
          quality: options.quality,
          preserveFace: options.preserveFace,
          saveToPermanentStorage: options.saveToPermanentStorage,
          onProgress: (status) => {
            if (options.onProgress) {
              options.onProgress(i, status, combinations.length)
            }
          }
        }
      )
      
      results.push({
        combination,
        result
      })
      
      totalCreditsUsed += result.generation.creditsUsed
      
      // Rate limiting: wait between combinations
      if (i < combinations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000)) // 3 second delay
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
  console.log(`💰 Total credits used: ${totalCreditsUsed}`)

  return results
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a URL is from LightX CDN
 */
export function isLightXUrl(url: string): boolean {
  return /^https:\/\/d3aa3s3yhl0emm\.cloudfront\.net\//.test(url)
}

/**
 * Check if a URL is from ImgBB CDN
 */
export function isImgBBUrl(url: string): boolean {
  return /^https:\/\/i\.ibb\.co\//.test(url)
}

/**
 * Extract image ID from ImgBB URL
 */
export function extractImgBBId(url: string): string | null {
  const match = url.match(/https:\/\/i\.ibb\.co\/([a-zA-Z0-9]+)\//)
  return match ? match[1] : null
}

/**
 * Validate image file for processing
 */
export function validateImageFile(file: File): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const MAX_SIZE = 5 * 1024 * 1024 // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push(`Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(', ')}`)
  }
  
  if (file.size > MAX_SIZE) {
    errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: 5MB`)
  }
  
  if (file.size < 1024) {
    errors.push('File too small: Minimum 1KB required')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Estimate processing cost for operations
 */
export function estimateProcessingCost(operations: {
  tryOnGenerations: number
  imageUploads: number
}): {
  lightxCredits: number
  estimatedTimeMinutes: number
} {
  const TRYON_COST = 2 // credits per try-on
  const AVG_PROCESSING_TIME = 30 // seconds per try-on
  const UPLOAD_TIME = 5 // seconds per upload
  
  return {
    lightxCredits: operations.tryOnGenerations * TRYON_COST,
    estimatedTimeMinutes: Math.ceil(
      (operations.tryOnGenerations * AVG_PROCESSING_TIME + 
       operations.imageUploads * UPLOAD_TIME) / 60
    )
  }
}
