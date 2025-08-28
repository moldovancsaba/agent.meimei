/**
 * Try-On Processing Library
 * 
 * Handles clothing try-on processing using ChangeMass try-on API.
 * Takes care of error handling and progress tracking.
 */

import { Person, ClothingItem } from '../types/models'

// ============================================================================
// TYPES
// ============================================================================

export interface TryOnResult {
  success: boolean
  generatedImageUrl: string
  requestId: string
  creditsUsed: number
  processingTimeMs: number
}

// ============================================================================
// PROCESSING FUNCTIONS
// ============================================================================

/**
 * Process virtual try-on with selected person and clothing.
 * Makes an API request to generate a realistic try-on image.
 * 
 * @param person Selected person model
 * @param clothing Selected clothing item
 * @param onProgress Optional progress callback (0-100)
 * @returns Try-on result with generated image URL
 */
export async function processVirtualTryOn(
  person: Person,
  clothing: ClothingItem,
  onProgress?: (progress: number) => void
): Promise<TryOnResult> {
  try {
    // Call server API route
    const response = await fetch('/api/try-on', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ person, clothing })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate virtual try-on')
    }
    
    const result = await response.json()
    
    // TODO: Update with server-side events for progress tracking
    // For now, we'll simulate progress since it's a single request
    if (onProgress) {
      onProgress(50) // Started processing
      await new Promise(resolve => setTimeout(resolve, 1000))
      onProgress(100) // Completed
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Try-on generation failed:', error)
    throw error instanceof Error ? error : new Error('Failed to generate virtual try-on')
  }
}
