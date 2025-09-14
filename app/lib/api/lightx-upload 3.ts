/**
 * LightX Image Upload API Client
 * 
 * Handles secure image uploads to LightX API v2 for AI processing.
 * Provides two-step upload process: URL generation and actual upload.
 * 
 * Features:
 * - Secure pre-signed URL generation
 * - Direct S3 upload with validation
 * - Error handling and retry logic
 * - File size and format validation
 * - Upload progress tracking
 */

import axios, { AxiosResponse, AxiosError } from 'axios'
import { LightXImageUploadResponse, ApiResponse } from '../../types/models'

// ============================================================================
// CONFIGURATION
// ============================================================================

const LIGHTX_BASE_URL = 'https://api.lightxeditor.com/external/api/v2'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB matching ImgBB limit
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png'] // LightX supported formats
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

// ============================================================================
// TYPES
// ============================================================================

interface LightXConfig {
  apiKey: string
  maxRetries?: number
  retryDelay?: number
}

interface UploadUrlRequest {
  uploadType: 'imageUrl'
  size: number
  contentType: string
}

interface UploadResult {
  imageUrl: string
  uploadImage: string
  size: number
  success: boolean
}

interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

class LightXUploadError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message)
    this.name = 'LightXUploadError'
  }
}

// ============================================================================
// LIGHTX UPLOAD API CLIENT CLASS
// ============================================================================

export class LightXUploadClient {
  private config: Required<LightXConfig>
  
  constructor(config: LightXConfig) {
    if (!config.apiKey) {
      throw new LightXUploadError('LightX API key is required')
    }

    this.config = {
      apiKey: config.apiKey,
      maxRetries: config.maxRetries || MAX_RETRIES,
      retryDelay: config.retryDelay || RETRY_DELAY,
    }
  }

  /**
   * Upload image using LightX two-step process
   * 
   * 1. Request pre-signed upload URL from LightX API
   * 2. Upload file directly to S3 using the pre-signed URL
   * 
   * @param file - Image file to upload
   * @param onProgress - Optional progress callback
   * @returns Promise<UploadResult>
   */
  async uploadImage(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Validate file before processing
      this.validateFile(file)
      
      console.log(`🔄 Starting LightX upload: ${file.name} (${this.formatFileSize(file.size)})`)
      
      // Step 1: Get pre-signed upload URL
      const uploadUrlResponse = await this.getUploadUrl(file)
      
      // Step 2: Upload file to S3
      await this.uploadToS3(uploadUrlResponse.body.uploadImage, file, onProgress)
      
      const result: UploadResult = {
        imageUrl: uploadUrlResponse.body.imageUrl,
        uploadImage: uploadUrlResponse.body.uploadImage,
        size: uploadUrlResponse.body.size,
        success: true
      }

      console.log(`✅ LightX upload successful: ${result.imageUrl}`)
      
      return result

    } catch (error) {
      console.error('❌ LightX upload failed:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Upload multiple images sequentially
   * 
   * Processes files one by one to respect API rate limits.
   * LightX API has stricter limits than ImgBB, so we use sequential processing.
   * 
   * @param files - Array of image files
   * @param onProgress - Optional progress callback for each file
   * @returns Promise<UploadResult[]>
   */
  async bulkUpload(
    files: File[],
    onProgress?: (fileIndex: number, progress: UploadProgress) => void
  ): Promise<UploadResult[]> {
    console.log(`📤 Starting LightX bulk upload: ${files.length} files`)
    
    const results: UploadResult[] = []
    const errors: { file: File; error: string }[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      try {
        const result = await this.uploadImage(file, (progress) => {
          if (onProgress) {
            onProgress(i, progress)
          }
        })
        
        results.push(result)
        
        // Add delay between uploads to avoid rate limiting
        if (i < files.length - 1) {
          await this.delay(1000) // 1 second between uploads
        }
        
      } catch (error) {
        console.error(`❌ Failed to upload ${file.name}:`, error)
        errors.push({
          file,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log(`✅ LightX bulk upload completed: ${results.length} successful, ${errors.length} failed`)
    
    if (errors.length > 0) {
      console.warn('❌ Upload errors:', errors)
    }
    
    return results
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Step 1: Get pre-signed upload URL from LightX API
   */
  private async getUploadUrl(file: File): Promise<LightXImageUploadResponse> {
    const requestData: UploadUrlRequest = {
      uploadType: 'imageUrl',
      size: file.size,
      contentType: file.type
    }

    const response = await this.executeWithRetry(() =>
      axios.post(`${LIGHTX_BASE_URL}/uploadImageUrl`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey
        },
        timeout: 10000 // 10 second timeout
      })
    )

    const result: LightXImageUploadResponse = response.data

    if (result.statusCode !== 2000) {
      throw new LightXUploadError(
        `Failed to get upload URL: ${result.message}`,
        result.statusCode
      )
    }

    return result
  }

  /**
   * Step 2: Upload file directly to S3 using pre-signed URL
   */
  private async uploadToS3(
    uploadUrl: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    const response = await this.executeWithRetry(() =>
      axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
          'Content-Length': file.size.toString()
        },
        timeout: 60000, // 60 second timeout for larger files
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress: UploadProgress = {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
            }
            onProgress(progress)
          }
        }
      })
    )

    if (response.status !== 200) {
      throw new LightXUploadError(
        `S3 upload failed with status: ${response.status}`,
        response.status
      )
    }
  }

  /**
   * Validate file format and size for LightX API
   */
  private validateFile(file: File): void {
    // Check file type (LightX is more restrictive than ImgBB)
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      throw new LightXUploadError(
        `Unsupported file format: ${file.type}. LightX supports: ${SUPPORTED_FORMATS.join(', ')}`
      )
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new LightXUploadError(
        `File too large: ${this.formatFileSize(file.size)}. Maximum allowed: ${this.formatFileSize(MAX_FILE_SIZE)}`
      )
    }

    // Check minimum size (LightX requirement)
    if (file.size < 1024) { // 1KB minimum
      throw new LightXUploadError(
        `File too small: ${this.formatFileSize(file.size)}. Minimum size: 1KB`
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
          // Don't retry on client errors or auth failures
          if (status && [400, 401, 403, 413, 415, 422].includes(status)) {
            throw error
          }
        }

        // If this is the last attempt, throw the error
        if (attempt === this.config.maxRetries) {
          throw error
        }

        // Calculate delay with exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1)
        console.log(`⏱️ LightX retry attempt ${attempt}/${this.config.maxRetries} in ${delay}ms`)
        
        await this.delay(delay)
      }
    }

    throw lastError!
  }

  /**
   * Handle and standardize errors
   */
  private handleError(error: any): LightXUploadError {
    if (error instanceof LightXUploadError) {
      return error
    }

    if (axios.isAxiosError(error)) {
      const response = error.response
      const status = response?.status
      const data = response?.data
      
      let message = error.message
      
      // Try to extract meaningful error message
      if (data?.message) {
        message = data.message
      } else if (data?.error?.message) {
        message = data.error.message
      }

      return new LightXUploadError(
        `LightX API Error (${status}): ${message}`,
        status,
        error
      )
    }

    return new LightXUploadError(
      error.message || 'Unknown LightX upload error',
      undefined,
      error
    )
  }

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

let lightxUploadClient: LightXUploadClient | null = null

/**
 * Get configured LightX Upload client instance
 * 
 * Creates singleton client with environment configuration.
 * Throws error if API key is not configured.
 * 
 * @returns Configured LightXUploadClient instance
 */
export function getLightXUploadClient(): LightXUploadClient {
  if (!lightxUploadClient) {
    // Check if we're in a server context
    if (typeof process === 'undefined') {
      throw new LightXUploadError('LightX client can only be used in server context')
    }
    
    console.log('🔍 [LightX] Checking environment variables...')
    console.log('🔍 [LightX] NODE_ENV:', process.env.NODE_ENV)
    console.log('🔍 [LightX] CWD:', process.cwd())
    
    // Try multiple ways to get the API key
    let apiKey = process.env.LIGHTX_API_KEY
    
    // If not found and we're in development, try to load from different sources
    if (!apiKey && process.env.NODE_ENV === 'development') {
      console.log('🔍 [LightX] API key not found, checking alternative sources...')
      
      // Check if running in a deployment environment with different env var patterns
      apiKey = process.env.VERCEL_LIGHTX_API_KEY || 
               process.env.NEXT_PUBLIC_LIGHTX_API_KEY ||
               '94b5b35ca92f4630b475d110ed861e8d_2d00ce0e2e1745779214dc63d9755e43_andoraitools' // Fallback for development
      
      if (apiKey && apiKey.startsWith('94b5b35ca92f4630b475d110ed861e8d')) {
        console.log('✅ [LightX] Using fallback API key for development')
      }
    }
    
    if (!apiKey) {
      // Enhanced debugging for environment variable issues
      const allEnvKeys = Object.keys(process.env)
      const relevantKeys = allEnvKeys.filter(key => 
        key.includes('LIGHTX') || key.includes('API') || key === 'NODE_ENV' || key.includes('VERCEL')
      )
      
      console.error('❌ [LightX] LIGHTX_API_KEY not found')
      console.error('🔍 [LightX] Available relevant env keys:', relevantKeys)
      console.error('🔍 [LightX] Total env keys:', allEnvKeys.length)
      console.error('🔍 [LightX] All env keys sample:', allEnvKeys.slice(0, 10))
      
      throw new LightXUploadError(
        'LIGHTX_API_KEY environment variable is not configured.\n' +
        'Make sure it is set in your .env.local file and the server has been restarted.\n' +
        `Debug info: NODE_ENV=${process.env.NODE_ENV}, CWD=${process.cwd()}, ENV_KEYS=${allEnvKeys.length}\n` +
        `Relevant keys: ${relevantKeys.join(', ')}`
      )
    }
    
    console.log('✅ [LightX] API key found, creating client...')
    lightxUploadClient = new LightXUploadClient({ apiKey })
    console.log('✅ [LightX] Upload client created successfully')
  }

  return lightxUploadClient
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick single image upload to LightX
 * 
 * Simplified wrapper for common upload use case.
 * Uses singleton client with environment configuration.
 * 
 * @param file - Image file to upload
 * @param onProgress - Optional progress callback
 * @returns Promise<UploadResult>
 */
export async function uploadToLightX(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const client = getLightXUploadClient()
  return client.uploadImage(file, onProgress)
}

/**
 * Bulk upload to LightX with sequential processing
 * 
 * @param files - Array of image files
 * @param onProgress - Optional progress callback
 * @returns Promise<UploadResult[]>
 */
export async function bulkUploadToLightX(
  files: File[],
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<UploadResult[]> {
  const client = getLightXUploadClient()
  return client.bulkUpload(files, onProgress)
}

// Export types for external use
export type { LightXConfig, UploadResult, UploadProgress }
export { LightXUploadError }
