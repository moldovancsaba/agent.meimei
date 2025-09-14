/**
 * LightX AI Virtual Try-On API Client
 * 
 * Handles AI-powered virtual outfit try-on processing using LightX API v2.
 * Processes clothing items onto person photos with advanced AI algorithms.
 * 
 * Features:
 * - Virtual try-on processing with clothing and person images
 * - Async processing with polling for completion
 * - Progress tracking and status monitoring
 * - Error handling and retry logic
 * - Cost tracking (2 credits per generation)
 */

import axios, { AxiosResponse, AxiosError } from 'axios'
import { LightXTryOnResponse, TryOnStatus } from '../../types/models'

// ============================================================================
// CONFIGURATION
// ============================================================================

const LIGHTX_BASE_URL = 'https://api.lightxeditor.com/external/api/v2'
const GENERATION_COST = 2 // Credits per try-on generation
const MAX_RETRIES = 3
const RETRY_DELAY = 1000
const POLLING_INTERVAL = 5000 // 5 seconds between status checks
const MAX_POLLING_TIME = 300000 // 5 minutes maximum wait time

// ============================================================================
// TYPES
// ============================================================================

interface LightXTryOnConfig {
  apiKey: string
  maxRetries?: number
  retryDelay?: number
  pollingInterval?: number
  maxPollingTime?: number
}

interface TryOnRequest {
  personImageUrl: string    // LightX CDN URL of the person
  clothingImageUrl: string  // LightX CDN URL of the clothing item
  quality?: 'low' | 'medium' | 'high'
  preserveFace?: boolean
  metadata?: Record<string, any>
}

interface TryOnResult {
  success: boolean
  generatedImageUrl: string
  requestId: string
  creditsUsed: number
  processingTimeMs: number
  quality: 'low' | 'medium' | 'high'
  metadata?: Record<string, any>
}

interface ProcessingStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number // 0-100
  message: string
  estimatedTimeRemaining?: number // seconds
  creditsUsed: number
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

class LightXTryOnError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public creditsCharged?: number,
    public originalError?: any
  ) {
    super(message)
    this.name = 'LightXTryOnError'
  }
}

// ============================================================================
// LIGHTX TRY-ON API CLIENT CLASS
// ============================================================================

export class LightXTryOnClient {
  private config: Required<LightXTryOnConfig>
  
  constructor(config: LightXTryOnConfig) {
    if (!config.apiKey) {
      throw new LightXTryOnError('LightX API key is required')
    }

    this.config = {
      apiKey: config.apiKey,
      maxRetries: config.maxRetries || MAX_RETRIES,
      retryDelay: config.retryDelay || RETRY_DELAY,
      pollingInterval: config.pollingInterval || POLLING_INTERVAL,
      maxPollingTime: config.maxPollingTime || MAX_POLLING_TIME,
    }
  }

  /**
   * Generate virtual try-on image
   * 
   * Processes a clothing item onto a person image using AI.
   * Handles async processing with progress tracking.
   * 
   * @param request - Try-on generation request
   * @param onProgress - Optional progress callback
   * @returns Promise<TryOnResult>
   */
  async generateTryOn(
    request: TryOnRequest,
    onProgress?: (status: ProcessingStatus) => void
  ): Promise<TryOnResult> {
    try {
      console.log('🎭 Starting virtual try-on generation...')
      
      // Validate request parameters
      this.validateTryOnRequest(request)
      
      // Submit generation request
      const submissionResponse = await this.submitTryOnRequest(request)
      
      // Poll for completion
      const result = await this.pollForCompletion(
        submissionResponse.requestId,
        onProgress
      )
      
      console.log(`✅ Try-on generation completed in ${result.processingTimeMs}ms`)
      console.log(`💰 Credits used: ${result.creditsUsed}`)
      
      return result

    } catch (error) {
      console.error('❌ Virtual try-on generation failed:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Generate multiple try-ons with batch processing
   * 
   * Processes multiple clothing items and/or person combinations.
   * Handles rate limiting and progress tracking for each generation.
   * 
   * @param requests - Array of try-on requests
   * @param onProgress - Optional progress callback with batch info
   * @returns Promise<TryOnResult[]>
   */
  async batchGenerateTryOn(
    requests: TryOnRequest[],
    onProgress?: (batchIndex: number, status: ProcessingStatus, totalBatches: number) => void
  ): Promise<TryOnResult[]> {
    console.log(`🎭 Starting batch try-on generation: ${requests.length} requests`)
    
    const results: TryOnResult[] = []
    const errors: { request: TryOnRequest; error: string }[] = []
    let totalCreditsUsed = 0

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i]
      
      try {
        console.log(`🔄 Processing batch ${i + 1}/${requests.length}`)
        
        const result = await this.generateTryOn(request, (status) => {
          if (onProgress) {
            onProgress(i, status, requests.length)
          }
        })
        
        results.push(result)
        totalCreditsUsed += result.creditsUsed
        
        // Add delay between requests to respect rate limits
        if (i < requests.length - 1) {
          await this.delay(2000) // 2 seconds between requests
        }
        
      } catch (error) {
        console.error(`❌ Batch ${i + 1} failed:`, error)
        errors.push({
          request,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log(`✅ Batch try-on completed: ${results.length} successful, ${errors.length} failed`)
    console.log(`💰 Total credits used: ${totalCreditsUsed}`)
    
    if (errors.length > 0) {
      console.warn('❌ Batch errors:', errors)
    }
    
    return results
  }

  /**
   * Get generation status by request ID
   * 
   * Check the current status of a try-on generation.
   * Useful for monitoring long-running generations.
   * 
   * @param requestId - LightX generation request ID
   * @returns Promise<ProcessingStatus>
   */
  async getGenerationStatus(requestId: string): Promise<ProcessingStatus> {
    try {
      const response = await this.executeWithRetry(() =>
        axios.get(`${LIGHTX_BASE_URL}/try-on/status/${requestId}`, {
          headers: {
            'x-api-key': this.config.apiKey
          },
          timeout: 10000
        })
      )

      return this.parseStatusResponse(response.data)
      
    } catch (error) {
      throw this.handleError(error)
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Submit try-on generation request
   */
  private async submitTryOnRequest(request: TryOnRequest): Promise<{ requestId: string }> {
    const requestData = {
      personImage: request.personImageUrl,
      clothingImage: request.clothingImageUrl,
      quality: request.quality || 'medium',
      preserveFace: request.preserveFace ?? true,
      ...request.metadata
    }

    const response = await this.executeWithRetry(() =>
      axios.post(`${LIGHTX_BASE_URL}/ai-virtual-outfit-try-on`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey
        },
        timeout: 30000 // Longer timeout for generation requests
      })
    )

    const result: LightXTryOnResponse = response.data

    if (result.statusCode !== 2000) {
      throw new LightXTryOnError(
        `Failed to submit try-on request: ${result.message}`,
        result.statusCode,
        result.body?.creditsUsed
      )
    }

    if (!result.body?.requestId) {
      throw new LightXTryOnError('No request ID received from LightX API')
    }

    return { requestId: result.body.requestId }
  }

  /**
   * Poll for generation completion
   */
  private async pollForCompletion(
    requestId: string,
    onProgress?: (status: ProcessingStatus) => void
  ): Promise<TryOnResult> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < this.config.maxPollingTime) {
      try {
        const status = await this.getGenerationStatus(requestId)
        
        if (onProgress) {
          onProgress(status)
        }
        
        // Check if generation is complete
        if (status.status === 'completed') {
          // Fetch final result
          return await this.fetchCompletedResult(requestId)
        }
        
        // Check for failure
        if (status.status === 'failed' || status.status === 'cancelled') {
          throw new LightXTryOnError(
            `Generation ${status.status}: ${status.message}`,
            undefined,
            status.creditsUsed
          )
        }
        
        // Wait before next poll
        await this.delay(this.config.pollingInterval)
        
      } catch (error) {
        // If it's a polling error, continue trying until timeout
        if (Date.now() - startTime >= this.config.maxPollingTime) {
          throw new LightXTryOnError(
            'Generation timeout: Maximum polling time exceeded',
            undefined,
            GENERATION_COST
          )
        }
        
        // Brief delay before retry
        await this.delay(1000)
      }
    }
    
    throw new LightXTryOnError(
      'Generation timeout: No response within maximum time',
      undefined,
      GENERATION_COST
    )
  }

  /**
   * Fetch completed generation result
   */
  private async fetchCompletedResult(requestId: string): Promise<TryOnResult> {
    const response = await this.executeWithRetry(() =>
      axios.get(`${LIGHTX_BASE_URL}/try-on/result/${requestId}`, {
        headers: {
          'x-api-key': this.config.apiKey
        },
        timeout: 15000
      })
    )

    const result: LightXTryOnResponse = response.data

    if (result.statusCode !== 2000 || !result.body?.generatedImageUrl) {
      throw new LightXTryOnError(
        `Failed to fetch result: ${result.message}`,
        result.statusCode,
        result.body?.creditsUsed
      )
    }

    return {
      success: true,
      generatedImageUrl: result.body.generatedImageUrl,
      requestId: result.body.requestId,
      creditsUsed: result.body.creditsUsed || GENERATION_COST,
      processingTimeMs: result.body.processingTimeMs || 0,
      quality: 'medium' // Default quality
    }
  }

  /**
   * Parse status response from LightX API
   */
  private parseStatusResponse(data: any): ProcessingStatus {
    return {
      status: data.status || 'pending',
      progress: Math.min(Math.max(data.progress || 0, 0), 100),
      message: data.message || 'Processing...',
      estimatedTimeRemaining: data.eta,
      creditsUsed: data.creditsUsed || 0
    }
  }

  /**
   * Validate try-on request parameters
   */
  private validateTryOnRequest(request: TryOnRequest): void {
    if (!request.personImageUrl || !request.clothingImageUrl) {
      throw new LightXTryOnError('Both person and clothing image URLs are required')
    }

    // Validate URLs are from LightX CDN (required for processing)
    const lightxUrlPattern = /^https:\/\/d3aa3s3yhl0emm\.cloudfront\.net\//
    
    if (!lightxUrlPattern.test(request.personImageUrl)) {
      throw new LightXTryOnError(
        'Person image must be uploaded to LightX CDN first (use LightX Upload API)'
      )
    }
    
    if (!lightxUrlPattern.test(request.clothingImageUrl)) {
      throw new LightXTryOnError(
        'Clothing image must be uploaded to LightX CDN first (use LightX Upload API)'
      )
    }
  }

  /**
   * Execute request with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(
    operation: () => Promise<AxiosResponse<T>>
  ): Promise<AxiosResponse<T>> {
    let lastError: Error

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation()
        
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on certain errors
        if (axios.isAxiosError(error)) {
          const status = error.response?.status
          if (status && [400, 401, 403, 422, 429].includes(status)) {
            throw error
          }
        }

        if (attempt === this.config.maxRetries) {
          throw error
        }

        const delay = this.config.retryDelay * Math.pow(2, attempt - 1)
        console.log(`⏱️ LightX try-on retry ${attempt}/${this.config.maxRetries} in ${delay}ms`)
        
        await this.delay(delay)
      }
    }

    throw lastError!
  }

  /**
   * Handle and standardize errors
   */
  private handleError(error: any): LightXTryOnError {
    if (error instanceof LightXTryOnError) {
      return error
    }

    if (axios.isAxiosError(error)) {
      const response = error.response
      const status = response?.status
      const data = response?.data
      
      let message = error.message
      let creditsCharged = 0
      
      // Try to extract meaningful error message and credit info
      if (data?.message) {
        message = data.message
      } else if (data?.error?.message) {
        message = data.error.message
      }
      
      if (data?.creditsUsed || data?.body?.creditsUsed) {
        creditsCharged = data.creditsUsed || data.body.creditsUsed
      }

      return new LightXTryOnError(
        `LightX Try-On Error (${status}): ${message}`,
        status,
        creditsCharged,
        error
      )
    }

    return new LightXTryOnError(
      error.message || 'Unknown LightX try-on error',
      undefined,
      undefined,
      error
    )
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ============================================================================
// SINGLETON CLIENT INSTANCE
// ============================================================================

let lightxTryOnClient: LightXTryOnClient | null = null

/**
 * Get configured LightX Try-On client instance
 */
export function getLightXTryOnClient(): LightXTryOnClient {
  if (!lightxTryOnClient) {
    // Access environment variable directly in server context
    if (typeof process === 'undefined') {
      throw new LightXTryOnError('LightX client can only be used in server context')
    }

    const apiKey = process.env.LIGHTX_API_KEY
    if (!apiKey) {
      throw new LightXTryOnError(
        'LIGHTX_API_KEY environment variable is not configured.\n' +
        'Make sure it is set in your .env.local file and the server has been restarted.'
      )
    }

    lightxTryOnClient = new LightXTryOnClient({ apiKey })
  }

  return lightxTryOnClient
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick virtual try-on generation
 */
export async function generateVirtualTryOn(
  personImageUrl: string,
  clothingImageUrl: string,
  options: {
    quality?: 'low' | 'medium' | 'high'
    preserveFace?: boolean
    onProgress?: (status: ProcessingStatus) => void
  } = {}
): Promise<TryOnResult> {
  const client = getLightXTryOnClient()
  
  return client.generateTryOn({
    personImageUrl,
    clothingImageUrl,
    quality: options.quality,
    preserveFace: options.preserveFace
  }, options.onProgress)
}

// Export types for external use
export type { LightXTryOnConfig, TryOnRequest, TryOnResult, ProcessingStatus }
export { LightXTryOnError }
