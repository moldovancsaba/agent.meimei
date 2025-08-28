/**
 * Client-side virtual try-on handler
 * 
 * Handles try-on processing through server API with proper LightX URL management.
 */

import { Person, ClothingItem } from '../../types/models'

interface TryOnResult {
  success: boolean
  generatedImageUrl: string
  requestId: string
  creditsUsed: number
  processingTimeMs: number
}

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
