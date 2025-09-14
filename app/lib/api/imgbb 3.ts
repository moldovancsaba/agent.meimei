/**
 * ImgBB CDN API Client
 * 
 * Provides comprehensive image storage functionality using ImgBB's API.
 * Handles uploads, metadata management, bulk operations, and error recovery.
 * 
 * Features:
 * - Single and bulk image uploads
 * - Automatic thumbnail generation
 * - URL management and retrieval
 * - Error handling with retry logic
 * - Rate limiting and request throttling
 */

import axios, { AxiosResponse, AxiosError } from 'axios'
import { ImgBBUploadResponse, ApiResponse } from '../../types/models'

// ============================================================================
// CONFIGURATION
// ============================================================================

const IMGBB_BASE_URL = 'https://api.imgbb.com/1'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second base delay

// ============================================================================
// TYPES
// ============================================================================

interface ImgBBConfig {
  apiKey: string
  maxRetries?: number
  retryDelay?: number
}

interface UploadOptions {
  name?: string
  expiration?: number // seconds
  metadata?: Record<string, any>
}

interface BulkUploadResult {
  successful: ImgBBUploadResponse[]
  failed: {
    file: File
    error: string
  }[]
  totalProcessed: number
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

class ImgBBError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message)
    this.name = 'ImgBBError'
  }
}

// ============================================================================
// IMGBB API CLIENT CLASS
// ============================================================================

export class ImgBBClient {
  private config: Required<ImgBBConfig>
  private requestQueue: Promise<any>[] = []

  constructor(config: ImgBBConfig) {
    if (!config.apiKey) {
      throw new ImgBBError('ImgBB API key is required')
    }

    this.config = {
      apiKey: config.apiKey,
      maxRetries: config.maxRetries || MAX_RETRIES,
      retryDelay: config.retryDelay || RETRY_DELAY,
    }
  }

  /**
   * Upload a single image to ImgBB
   * 
   * Validates file format and size, then uploads with retry logic.
   * Returns comprehensive upload response with URLs and metadata.
   * 
   * @param file - Image file to upload
   * @param options - Upload configuration options
   * @returns Promise<ImgBBUploadResponse>
   */
  async uploadImage(
    file: File,
    options: UploadOptions = {}
  ): Promise<ImgBBUploadResponse> {
    try {
      // Validate file
      this.validateFile(file)
      
      console.log(`📤 Uploading image: ${file.name} (${this.formatFileSize(file.size)})`)
      
      // Convert file to base64
      const base64 = await this.fileToBase64(file)
      
      // Prepare upload data
      const formData = new FormData()
      formData.append('image', base64)
      formData.append('key', this.config.apiKey)
      
      if (options.name) {
        formData.append('name', options.name)
      }
      
      if (options.expiration) {
        formData.append('expiration', options.expiration.toString())
      }

      // Execute upload with retry logic
      const response = await this.executeWithRetry(() =>
        axios.post(`${IMGBB_BASE_URL}/upload`, formData, {
          timeout: 30000, // 30 second timeout
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      )

      const result: ImgBBUploadResponse = response.data
      
      if (!result.success) {
        throw new ImgBBError(
          `Upload failed: ${result.status || 'Unknown error'}`,
          response.status
        )
      }

      console.log(`✅ Upload successful: ${result.data.url}`)
      
      return result

    } catch (error) {
      console.error('❌ ImgBB upload failed:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Upload multiple images in batch
   * 
   * Processes files concurrently with rate limiting.
   * Returns detailed results with successful and failed uploads.
   * 
   * @param files - Array of image files
   * @param options - Upload configuration options
   * @param concurrency - Maximum concurrent uploads (default: 3)
   * @returns Promise<BulkUploadResult>
   */
  async bulkUpload(
    files: File[],
    options: UploadOptions = {},
    concurrency = 3
  ): Promise<BulkUploadResult> {
    console.log(`📤 Starting bulk upload: ${files.length} files`)
    
    const result: BulkUploadResult = {
      successful: [],
      failed: [],
      totalProcessed: 0
    }

    // Process files in batches to respect rate limits
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency)
      
      const batchPromises = batch.map(async (file) => {
        try {
          const uploadResult = await this.uploadImage(file, {
            ...options,
            name: options.name || file.name,
          })
          
          result.successful.push(uploadResult)
          result.totalProcessed++
          
        } catch (error) {
          result.failed.push({
            file,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          result.totalProcessed++
        }
      })

      // Wait for batch to complete before proceeding
      await Promise.all(batchPromises)
      
      // Add small delay between batches to avoid rate limiting
      if (i + concurrency < files.length) {
        await this.delay(500)
      }
    }

    console.log(`✅ Bulk upload completed: ${result.successful.length} successful, ${result.failed.length} failed`)
    
    return result
  }

  /**
   * Get image information by URL
   * 
   * Extracts image metadata from ImgBB URLs.
   * Useful for retrieving image details without storing full responses.
   * 
   * @param imageUrl - ImgBB image URL
   * @returns Parsed image information
   */
  getImageInfo(imageUrl: string): {
    id: string | null
    originalUrl: string
    isImgBBUrl: boolean
  } {
    const imgbbRegex = /https:\/\/i\.ibb\.co\/([a-zA-Z0-9]+)\//
    const match = imageUrl.match(imgbbRegex)
    
    return {
      id: match ? match[1] : null,
      originalUrl: imageUrl,
      isImgBBUrl: Boolean(match)
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate uploaded file format and size
   */
  private validateFile(file: File): void {
    // Check file type
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      throw new ImgBBError(
        `Unsupported file format: ${file.type}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`
      )
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new ImgBBError(
        `File too large: ${this.formatFileSize(file.size)}. Maximum allowed: ${this.formatFileSize(MAX_FILE_SIZE)}`
      )
    }
  }

  /**
   * Convert File to base64 string
   * Handles both browser and Node.js environments
   */
  private async fileToBase64(file: File): Promise<string> {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && typeof FileReader !== 'undefined') {
      // Browser environment - use FileReader
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        
        reader.onload = () => {
          const result = reader.result as string
          // Remove data URL prefix (data:image/jpeg;base64,)
          const base64 = result.split(',')[1]
          resolve(base64)
        }
        
        reader.onerror = () => reject(new ImgBBError('Failed to read file'))
        reader.readAsDataURL(file)
      })
    } else {
      // Node.js environment - convert File/Blob to Buffer
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        return buffer.toString('base64')
      } catch (error) {
        throw new ImgBBError('Failed to convert file to base64')
      }
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
          if (status && [400, 401, 403, 413, 415].includes(status)) {
            throw error
          }
        }

        // If this is the last attempt, throw the error
        if (attempt === this.config.maxRetries) {
          throw error
        }

        // Calculate delay with exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1)
        console.log(`⏱️ Retry attempt ${attempt}/${this.config.maxRetries} in ${delay}ms`)
        
        await this.delay(delay)
      }
    }

    throw lastError!
  }

  /**
   * Handle and standardize errors
   */
  private handleError(error: any): ImgBBError {
    if (error instanceof ImgBBError) {
      return error
    }

    if (axios.isAxiosError(error)) {
      const response = error.response
      const status = response?.status
      const message = response?.data?.error?.message || error.message

      return new ImgBBError(
        `ImgBB API Error (${status}): ${message}`,
        status,
        error
      )
    }

    return new ImgBBError(
      error.message || 'Unknown ImgBB error',
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

let imgbbClient: ImgBBClient | null = null

/**
 * Get configured ImgBB client instance
 * 
 * Creates singleton client with environment configuration.
 * Throws error if API key is not configured.
 * 
 * @returns Configured ImgBBClient instance
 */
export function getImgBBClient(): ImgBBClient {
  if (!imgbbClient) {
    const apiKey = process.env.IMGBB_API_KEY
    
    if (!apiKey) {
      throw new ImgBBError(
        'IMGBB_API_KEY environment variable is not configured'
      )
    }

    imgbbClient = new ImgBBClient({ apiKey })
  }

  return imgbbClient
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick single image upload
 * 
 * Simplified wrapper for common upload use case.
 * Uses singleton client with environment configuration.
 * 
 * @param file - Image file to upload
 * @param name - Optional custom name
 * @returns Promise<ImgBBUploadResponse>
 */
export async function uploadToImgBB(
  file: File,
  name?: string
): Promise<ImgBBUploadResponse> {
  const client = getImgBBClient()
  return client.uploadImage(file, { name })
}

/**
 * Quick bulk upload
 * 
 * Simplified wrapper for bulk upload operations.
 * Uses singleton client with environment configuration.
 * 
 * @param files - Array of image files
 * @param concurrency - Maximum concurrent uploads
 * @returns Promise<BulkUploadResult>
 */
export async function bulkUploadToImgBB(
  files: File[],
  concurrency = 3
): Promise<BulkUploadResult> {
  const client = getImgBBClient()
  return client.bulkUpload(files, {}, concurrency)
}

// Export types for external use
export type { ImgBBConfig, UploadOptions, BulkUploadResult }
export { ImgBBError }
