/**
 * Replicate AI Virtual Try-On API Client
 * 
 * Reliable virtual try-on using Replicate's proven models.
 * Simple authentication with API token, no complex setup.
 */

import axios, { AxiosError } from 'axios'

// ============================================================================
// CONFIGURATION
// ============================================================================

const REPLICATE_API_URL = 'https://api.replicate.com/v1'
// Default model; can be overridden via REPLICATE_MODEL env var
const DEFAULT_TRYON_MODEL = 'cuuupid/idm-vton:906425dbca90663ff5427624839572cc56ea7d380343d13e2a4c4b09d3f0c30f'
const MAX_RETRIES = 3
const RETRY_DELAY = 2000

/**
 * Parse integer environment variables with sane defaults and guards.
 * Why: operational tunability without code changes; prevents NaN or invalid values.
 */
function parseEnvInt(name: string, fallback: number): number {
  const raw = typeof process !== 'undefined' ? process.env[name] : undefined
  const parsed = raw ? parseInt(raw, 10) : NaN
  if (Number.isNaN(parsed) || parsed <= 0) return fallback
  return parsed
}

// Request timeouts and polling cadence are configurable via env to avoid hard failures when
// Replicate queues are slow. Defaults chosen to balance UX and reliability.
const REQUEST_TIMEOUT = parseEnvInt('REPLICATE_REQUEST_TIMEOUT_MS', 300000) // default 5 minutes
const POLL_INTERVAL = parseEnvInt('REPLICATE_POLL_INTERVAL_MS', 3000) // default 3 seconds
const MAX_POLL_TIME = parseEnvInt('REPLICATE_MAX_POLL_TIME_MS', 900000) // default 15 minutes

// ============================================================================
// TYPES
// ============================================================================

export interface ReplicateConfig {
  apiToken: string
  model?: string
  maxRetries?: number
  retryDelay?: number
}

export interface TryOnRequest {
  personImageUrl: string
  clothingImageUrl: string
  personName?: string
  clothingName?: string
  quality?: 'standard' | 'high'
  style?: 'realistic' | 'fashion' | 'casual'
}

export interface TryOnResult {
  success: boolean
  generatedImageUrl: string // Replicate returns URLs, not base64
  processingTimeMs: number
  requestId: string
  metadata?: Record<string, any>
}

interface ReplicatePredictionRequest {
  version: string
  input: {
    human_img: string // URL to person image
    garm_img: string // URL to garment image
    garment_des: string // Garment description
    is_checked?: boolean
    is_checked_crop?: boolean
    denoise_steps?: number
    seed?: number
  }
}

interface ReplicatePrediction {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string[] | string | null
  error?: string
  logs?: string
  created_at: string
  started_at?: string
  completed_at?: string
  urls: {
    get: string
    cancel: string
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class ReplicateTryOnError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message)
    this.name = 'ReplicateTryOnError'
  }
}

// ============================================================================
// REPLICATE VIRTUAL TRY-ON CLIENT
// ============================================================================

export class ReplicateTryOnClient {
  private config: Required<ReplicateConfig>
  private apiToken: string

  constructor(config: ReplicateConfig) {
    if (!config.apiToken) {
      throw new ReplicateTryOnError('Replicate API token is required')
    }

    this.apiToken = config.apiToken
this.config = {
      apiToken: config.apiToken,
      // Allow overriding the model via env for flexibility without code changes
      model: config.model || (typeof process !== 'undefined' ? (process.env.REPLICATE_MODEL || DEFAULT_TRYON_MODEL) : DEFAULT_TRYON_MODEL),
      maxRetries: config.maxRetries || MAX_RETRIES,
      retryDelay: config.retryDelay || RETRY_DELAY
    }
  }

  /**
   * Generate virtual try-on using Replicate
   */
  async generateTryOn(request: TryOnRequest): Promise<TryOnResult> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()

    try {
      console.log('🔄 Starting Replicate virtual try-on generation...')
      console.log(`📋 Request ID: ${requestId}`)
      console.log(`👤 Person: ${request.personName || 'Unknown'}`)
      console.log(`👕 Clothing: ${request.clothingName || 'Unknown'}`)

      // Validate request
      this.validateRequest(request)

      // Create prediction
      console.log('🚀 Creating Replicate prediction...')
      const prediction = await this.createPrediction(request)
      
      // Poll for completion
      console.log(`⏳ Waiting for prediction ${prediction.id}...`)
      const completedPrediction = await this.pollPrediction(prediction.id)

      if (!completedPrediction.output) {
        throw new ReplicateTryOnError('No output from Replicate prediction')
      }

      // Extract output URL
      let generatedImageUrl: string
      if (Array.isArray(completedPrediction.output)) {
        generatedImageUrl = completedPrediction.output[0]
      } else if (typeof completedPrediction.output === 'string') {
        generatedImageUrl = completedPrediction.output
      } else {
        throw new ReplicateTryOnError('Invalid output format from Replicate')
      }

      const processingTime = Date.now() - startTime
      
      const result: TryOnResult = {
        success: true,
        generatedImageUrl,
        processingTimeMs: processingTime,
        requestId,
        metadata: {
          model: this.config.model,
          personName: request.personName,
          clothingName: request.clothingName,
          style: request.style || 'realistic',
          quality: request.quality || 'standard',
          replicatePredictionId: completedPrediction.id
        }
      }

      console.log(`✅ Try-on generated successfully in ${processingTime}ms`)
      console.log(`🖼️ Result: ${generatedImageUrl}`)
      return result

    } catch (error) {
      console.error('❌ Try-on generation failed:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Generate multiple try-ons
   */
  async batchGenerateTryOn(requests: TryOnRequest[]): Promise<TryOnResult[]> {
    console.log(`🔄 Starting batch try-on generation: ${requests.length} requests`)

    const results: TryOnResult[] = []
    
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i]
      
      try {
        console.log(`🔄 Processing ${i + 1}/${requests.length}`)
        const result = await this.generateTryOn(request)
        results.push(result)
        
        // Rate limiting - wait between requests
        if (i < requests.length - 1) {
          console.log('⏱️ Rate limiting delay...')
          await this.delay(5000) // 5 seconds between requests
        }
        
      } catch (error) {
        console.error(`❌ Request ${i + 1} failed:`, error)
        // Continue with other requests
      }
    }

    console.log(`✅ Batch completed: ${results.length}/${requests.length} successful`)
    return results
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Create a prediction on Replicate
   */
  private async createPrediction(request: TryOnRequest): Promise<ReplicatePrediction> {
    const [modelOwner, modelName] = this.config.model.split('/')
    const modelVersion = this.config.model.split(':')[1]

    const predictionRequest: ReplicatePredictionRequest = {
      version: modelVersion,
      input: {
        human_img: request.personImageUrl,
        garm_img: request.clothingImageUrl,
        garment_des: request.clothingName || 'clothing item',
        is_checked: true,
        is_checked_crop: false,
        denoise_steps: request.quality === 'high' ? 30 : 20,
        seed: Math.floor(Math.random() * 1000000)
      }
    }

    return await this.executeWithRetry(async () => {
      const response = await axios.post(
        `${REPLICATE_API_URL}/predictions`,
        predictionRequest,
        {
          headers: {
            'Authorization': `Token ${this.apiToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'ChangeMass-Replicate/1.0'
          },
          timeout: REQUEST_TIMEOUT
        }
      )

      return response.data
    })
  }

  /**
   * Poll a prediction until completion
   */
  private async pollPrediction(predictionId: string): Promise<ReplicatePrediction> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < MAX_POLL_TIME) {
      try {
        const response = await axios.get(
          `${REPLICATE_API_URL}/predictions/${predictionId}`,
          {
            headers: {
              'Authorization': `Token ${this.apiToken}`,
              'User-Agent': 'ChangeMass-Replicate/1.0'
            },
            timeout: 10000
          }
        )

        const prediction: ReplicatePrediction = response.data

        console.log(`📊 Prediction status: ${prediction.status}`)

        if (prediction.status === 'succeeded') {
          return prediction
        }

        if (prediction.status === 'failed') {
          throw new ReplicateTryOnError(
            `Prediction failed: ${prediction.error || 'Unknown error'}`
          )
        }

        if (prediction.status === 'canceled') {
          throw new ReplicateTryOnError('Prediction was canceled')
        }

        // Wait before next poll
        await this.delay(POLL_INTERVAL)

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new ReplicateTryOnError(
            `Failed to poll prediction: ${error.message}`,
            error.response?.status,
            error
          )
        }
        throw error
      }
    }

    throw new ReplicateTryOnError('Prediction timed out')
  }

  /**
   * Execute with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on certain errors
        if (axios.isAxiosError(error)) {
          const status = error.response?.status
          // Don't retry client errors (except 429 rate limit)
          if (status && [400, 401, 403, 404, 422].includes(status)) {
            throw error
          }
        }

        if (attempt === this.config.maxRetries) {
          throw error
        }

        const delay = this.config.retryDelay * Math.pow(2, attempt - 1)
        console.log(`⏱️ Retry ${attempt}/${this.config.maxRetries} in ${delay}ms`)
        
        await this.delay(delay)
      }
    }

    throw lastError!
  }

  /**
   * Validate request parameters
   */
  private validateRequest(request: TryOnRequest): void {
    if (!request.personImageUrl) {
      throw new ReplicateTryOnError('Person image URL is required')
    }
    
    if (!request.clothingImageUrl) {
      throw new ReplicateTryOnError('Clothing image URL is required')
    }

    // Validate URLs
    try {
      new URL(request.personImageUrl)
      new URL(request.clothingImageUrl)
    } catch {
      throw new ReplicateTryOnError('Invalid image URLs provided')
    }
  }

  /**
   * Handle and format errors
   */
  private handleError(error: any): ReplicateTryOnError {
    if (error instanceof ReplicateTryOnError) {
      return error
    }

    if (axios.isAxiosError(error)) {
      const response = error.response
      const status = response?.status
      const data = response?.data
      
      let message = error.message
      
      if (data?.detail) {
        message = data.detail
      } else if (data?.message) {
        message = data.message
      } else if (status === 401) {
        message = 'Invalid Replicate API token'
      } else if (status === 402) {
        message = 'Insufficient Replicate credits'
      } else if (status === 429) {
        message = 'Rate limit exceeded. Try again later.'
      } else if (status === 500) {
        message = 'Replicate service error. Try again later.'
      }

      return new ReplicateTryOnError(
        `Replicate API Error (${status}): ${message}`,
        status,
        error
      )
    }

    return new ReplicateTryOnError(
      error.message || 'Unknown error occurred',
      undefined,
      error
    )
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ============================================================================
// SINGLETON AND CONVENIENCE FUNCTIONS
// ============================================================================

let replicateClient: ReplicateTryOnClient | null = null

/**
 * Get configured Replicate client instance
 */
export function getReplicateTryOnClient(): ReplicateTryOnClient {
  if (!replicateClient) {
    // Check server context
    if (typeof process === 'undefined') {
      throw new ReplicateTryOnError('Replicate client can only be used server-side')
    }

    console.log('🔍 Initializing Replicate client...')

    const apiToken = process.env.REPLICATE_API_TOKEN

    if (!apiToken) {
      throw new ReplicateTryOnError('REPLICATE_API_TOKEN environment variable is required')
    }

    replicateClient = new ReplicateTryOnClient({
      apiToken
    })

console.log('✅ Replicate client initialized')
    // Log effective polling/timeout values for diagnostics (ISO 8601 timestamps are handled by log aggregator)
    console.log(`🔧 Replicate config → pollInterval=${POLL_INTERVAL}ms, maxPollTime=${MAX_POLL_TIME}ms, requestTimeout=${REQUEST_TIMEOUT}ms`)
  }

  return replicateClient
}

/**
 * Quick virtual try-on generation
 */
export async function generateVirtualTryOn(
  personImageUrl: string,
  clothingImageUrl: string,
  options: {
    personName?: string
    clothingName?: string
    quality?: 'standard' | 'high'
    style?: 'realistic' | 'fashion' | 'casual'
  } = {}
): Promise<TryOnResult> {
  const client = getReplicateTryOnClient()
  
  return client.generateTryOn({
    personImageUrl,
    clothingImageUrl,
    personName: options.personName,
    clothingName: options.clothingName,
    quality: options.quality || 'standard',
    style: options.style || 'realistic'
  })
}
