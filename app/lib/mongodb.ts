/**
 * MongoDB Connection Utility for ChangeMass
 * 
 * Provides a robust, production-ready singleton connection to MongoDB Atlas.
 * Handles connection caching, error handling, retry logic, and state management.
 * 
 * This implementation follows MongoDB and Next.js best practices:
 * - Singleton pattern prevents multiple connections in development
 * - Exponential backoff retry logic for transient failures
 * - Comprehensive error handling and logging
 * - Connection pooling optimized for serverless environments
 * - Automatic cleanup and graceful shutdown handling
 */

import mongoose from 'mongoose'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface ConnectionState {
  isConnected: boolean;
  connectionPromise: Promise<mongoose.Mongoose> | null;
  lastConnectedAt: Date | null;
  retryCount: number;
}

interface ConnectionOptions {
  maxRetries: number;
  retryDelayMs: number;
  connectionTimeoutMs: number;
  serverSelectionTimeoutMs: number;
}

interface DatabaseMetrics {
  connectionAttempts: number;
  successfulConnections: number;
  failedConnections: number;
  lastConnectionTime: Date | null;
  currentStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

// Global connection state - singleton pattern
const connectionState: ConnectionState = {
  isConnected: false,
  connectionPromise: null,
  lastConnectedAt: null,
  retryCount: 0
}

// Connection metrics for monitoring and debugging
const metrics: DatabaseMetrics = {
  connectionAttempts: 0,
  successfulConnections: 0,
  failedConnections: 0,
  lastConnectionTime: null,
  currentStatus: 'disconnected'
}

// Default connection configuration
const defaultOptions: ConnectionOptions = {
  maxRetries: 3,
  retryDelayMs: 2000,
  connectionTimeoutMs: 30000,
  serverSelectionTimeoutMs: 10000
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates and encodes the MongoDB connection URI
 * Ensures special characters in passwords are properly URL-encoded
 */
function validateAndEncodeUri(uri: string): string {
  try {
    // Parse the URI to validate format
    const url = new URL(uri)
    
    // Check if it's a valid MongoDB URI
    if (!url.protocol.startsWith('mongodb')) {
      throw new Error('Invalid MongoDB URI protocol')
    }
    
    // Return the original URI - MongoDB driver handles encoding internally
    // We don't need to manually encode since the .env.local already has proper format
    return uri
  } catch (error) {
    throw new Error(`Invalid MongoDB URI format: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Calculates exponential backoff delay for retry attempts
 */
function calculateRetryDelay(attemptNumber: number, baseDelayMs: number): number {
  return Math.min(baseDelayMs * Math.pow(2, attemptNumber - 1), 30000) // Cap at 30 seconds
}

/**
 * Creates optimized Mongoose connection options for Next.js/Vercel
 */
function createConnectionOptions(): mongoose.ConnectOptions {
  return {
    // Connection pool settings optimized for serverless
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    
    // Timeout settings for reliability
    serverSelectionTimeoutMS: defaultOptions.serverSelectionTimeoutMs,
    socketTimeoutMS: 45000,
    connectTimeoutMS: defaultOptions.connectionTimeoutMs,
    
    // Reliability settings
    retryWrites: true,
    retryReads: true,
    
    // Performance settings
    compressors: ['zlib'],
    zlibCompressionLevel: 6,
    
    // IMPORTANT: Enable buffering to prevent timing issues
    // We'll handle connection state properly instead of disabling buffering
    bufferCommands: true // Enable buffering to prevent connection timing issues
  } as mongoose.ConnectOptions
}

// ============================================================================
// MAIN CONNECTION FUNCTION
// ============================================================================

/**
 * Establishes connection to MongoDB Atlas with robust error handling
 * 
 * Uses singleton pattern to prevent multiple connections and implements
 * exponential backoff retry logic for transient failures.
 * 
 * @returns Promise<void>
 * @throws Error if connection fails after all retry attempts
 */
async function connectToDatabase(): Promise<void> {
  // Return immediately if already connected
  if (connectionState.isConnected && mongoose.connection.readyState === 1) {
    console.log('📦 [MongoDB] Using existing connection')
    return
  }
  
  // Return existing connection promise if one is in progress
  if (connectionState.connectionPromise) {
    console.log('⏳ [MongoDB] Connection in progress, waiting...')
    await connectionState.connectionPromise
    return
  }
  
  // Validate MongoDB URI from environment
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    const error = new Error(
      '🚫 MONGODB_URI environment variable not configured. ' +
      'Please add your MongoDB Atlas connection string to .env.local'
    )
    metrics.failedConnections++
    metrics.currentStatus = 'error'
    throw error
  }
  
  // Create connection promise and store it
  connectionState.connectionPromise = attemptConnection(mongoUri)
  
  try {
    await connectionState.connectionPromise
  } finally {
    // Clear the connection promise when done (success or failure)
    connectionState.connectionPromise = null
  }
}

/**
 * Internal function that handles the actual connection logic with retries
 */
async function attemptConnection(mongoUri: string): Promise<mongoose.Mongoose> {
  const validatedUri = validateAndEncodeUri(mongoUri)
  const options = createConnectionOptions()
  
  let lastError: Error = new Error('No connection attempts made')
  
  for (let attempt = 1; attempt <= defaultOptions.maxRetries; attempt++) {
    try {
      metrics.connectionAttempts++
      metrics.currentStatus = 'connecting'
      
      console.log(`🔄 [MongoDB] Connection attempt ${attempt}/${defaultOptions.maxRetries}...`)
      
      // Attempt connection with timeout
      const db = await mongoose.connect(validatedUri, options)
      
      // Connection successful
      connectionState.isConnected = true
      connectionState.lastConnectedAt = new Date()
      connectionState.retryCount = 0
      metrics.successfulConnections++
      metrics.lastConnectionTime = new Date()
      metrics.currentStatus = 'connected'
      
      console.log('✅ [MongoDB] Connected successfully')
      console.log(`📊 [MongoDB] Database: ${db.connections[0]?.name || 'Unknown'}`)
      console.log(`🌐 [MongoDB] Host: ${db.connections[0]?.host || 'Unknown'}`)
      
      return db
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      metrics.failedConnections++
      connectionState.retryCount = attempt
      
      console.error(`❌ [MongoDB] Attempt ${attempt} failed:`, lastError.message)
      
      // Categorize error for better debugging
      categorizeAndLogError(lastError)
      
      // If this isn't the last attempt, wait before retrying
      if (attempt < defaultOptions.maxRetries) {
        const delayMs = calculateRetryDelay(attempt, defaultOptions.retryDelayMs)
        console.log(`⏱️  [MongoDB] Retrying in ${delayMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }
  
  // All retry attempts failed
  metrics.currentStatus = 'error'
  connectionState.isConnected = false
  
  const finalError = new Error(
    `MongoDB connection failed after ${defaultOptions.maxRetries} attempts. Last error: ${lastError.message}`
  )
  
  console.error('💥 [MongoDB] All connection attempts exhausted')
  throw finalError
}

// ============================================================================
// ERROR HANDLING AND CATEGORIZATION
// ============================================================================

/**
 * Categorizes MongoDB errors for better debugging and user feedback
 * Provides specific error messages and troubleshooting hints
 */
function categorizeAndLogError(error: Error): void {
  const message = error.message.toLowerCase()
  
  if (message.includes('authentication failed') || message.includes('auth')) {
    console.error('🔐 [MongoDB] Authentication Error: Invalid credentials')
    console.error('💡 [MongoDB] Check your username/password in MONGODB_URI')
  } else if (message.includes('enotfound') || message.includes('network')) {
    console.error('🌐 [MongoDB] Network Error: Cannot reach MongoDB servers')
    console.error('💡 [MongoDB] Check your internet connection and whitelist your IP')
  } else if (message.includes('mongoparserrror') || message.includes('parse')) {
    console.error('📝 [MongoDB] URI Parse Error: Invalid connection string format')
    console.error('💡 [MongoDB] Check your MONGODB_URI format and encoding')
  } else if (message.includes('timeout') || message.includes('timed out')) {
    console.error('⏰ [MongoDB] Timeout Error: Connection took too long')
    console.error('💡 [MongoDB] Check server availability and network latency')
  } else if (message.includes('server selection')) {
    console.error('🎯 [MongoDB] Server Selection Error: No available servers')
    console.error('💡 [MongoDB] Check cluster status and network configuration')
  } else if (message.includes('pool')) {
    console.error('🏊 [MongoDB] Connection Pool Error')
    console.error('💡 [MongoDB] Too many concurrent connections or pool misconfiguration')
  } else {
    console.error('❓ [MongoDB] Unknown Error:', error.message)
    console.error('💡 [MongoDB] Check logs above for more details')
  }
}

// ============================================================================
// UTILITY AND MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Disconnect from MongoDB with proper cleanup
 * 
 * Cleanly closes the MongoDB connection and resets state.
 * Useful for testing, development, and application shutdown.
 * 
 * @returns Promise<void>
 */
async function disconnectFromDatabase(): Promise<void> {
  try {
    if (connectionState.isConnected || mongoose.connection.readyState !== 0) {
      console.log('🔌 [MongoDB] Closing connection...')
      await mongoose.disconnect()
      
      // Reset connection state
      connectionState.isConnected = false
      connectionState.lastConnectedAt = null
      connectionState.retryCount = 0
      metrics.currentStatus = 'disconnected'
      
      console.log('✅ [MongoDB] Disconnected successfully')
    } else {
      console.log('ℹ️  [MongoDB] Already disconnected')
    }
  } catch (error) {
    console.error('❌ [MongoDB] Error during disconnection:', error)
    // Force reset state even if disconnect fails
    connectionState.isConnected = false
    metrics.currentStatus = 'error'
  }
}

/**
 * Get current connection status
 * 
 * Returns detailed connection state information.
 * Useful for health checks, debugging, and monitoring.
 * 
 * @returns boolean - true if connected and ready, false otherwise
 */
function isConnected(): boolean {
  return connectionState.isConnected && mongoose.connection.readyState === 1
}

/**
 * Get database instance
 * 
 * Returns the current Mongoose connection if available.
 * Useful for direct database operations and advanced queries.
 * 
 * @returns mongoose.Connection | null
 */
function getDatabase(): mongoose.Connection | null {
  if (isConnected()) {
    return mongoose.connection
  }
  return null
}

/**
 * Get connection metrics and status
 * 
 * Returns detailed metrics about connection attempts and current state.
 * Useful for monitoring, debugging, and health checks.
 * 
 * @returns DatabaseMetrics & ConnectionState with computed uptime
 */
function getConnectionMetrics(): DatabaseMetrics & ConnectionState & { uptime: number } {
  return {
    ...metrics,
    ...connectionState,
    // Add computed fields
    uptime: connectionState.lastConnectedAt 
      ? Date.now() - connectionState.lastConnectedAt.getTime() 
      : 0
  }
}

/**
 * Reset connection metrics
 * 
 * Clears all recorded metrics. Useful for testing and development.
 */
function resetMetrics(): void {
  metrics.connectionAttempts = 0
  metrics.successfulConnections = 0
  metrics.failedConnections = 0
  metrics.lastConnectionTime = null
  metrics.currentStatus = 'disconnected'
  
  console.log('🧹 [MongoDB] Metrics reset')
}

/**
 * Force reconnection
 * 
 * Closes current connection and establishes a new one.
 * Useful for recovery scenarios or configuration changes.
 * 
 * @returns Promise<void>
 */
async function forceReconnect(): Promise<void> {
  console.log('🔄 [MongoDB] Forcing reconnection...')
  
  await disconnectFromDatabase()
  
  // Clear any existing connection promise
  connectionState.connectionPromise = null
  
  // Wait a moment for cleanup
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Establish new connection
  await connectToDatabase()
}

// ============================================================================
// EVENT LISTENERS AND MONITORING
// ============================================================================

// Connection event listeners for comprehensive monitoring
mongoose.connection.on('connected', () => {
  console.log('🟢 [Mongoose] Connection established')
  connectionState.isConnected = true
  metrics.currentStatus = 'connected'
})

mongoose.connection.on('error', (error) => {
  console.error('🔴 [Mongoose] Connection error:', error.message)
  connectionState.isConnected = false
  metrics.currentStatus = 'error'
  categorizeAndLogError(error)
})

mongoose.connection.on('disconnected', () => {
  console.log('🟡 [Mongoose] Connection lost')
  connectionState.isConnected = false
  metrics.currentStatus = 'disconnected'
})

mongoose.connection.on('reconnected', () => {
  console.log('🔄 [Mongoose] Reconnected to database')
  connectionState.isConnected = true
  metrics.currentStatus = 'connected'
})

mongoose.connection.on('close', () => {
  console.log('🔒 [Mongoose] Connection closed')
  connectionState.isConnected = false
  metrics.currentStatus = 'disconnected'
})

// Graceful shutdown handling for development and production
const handleShutdown = async (signal: string) => {
  console.log(`🛑 [MongoDB] Received ${signal}, closing connection...`)
  await disconnectFromDatabase()
  process.exit(0)
}

// Register shutdown handlers
process.on('SIGINT', () => handleShutdown('SIGINT'))
process.on('SIGTERM', () => handleShutdown('SIGTERM'))

// Handle uncaught exceptions in development
if (process.env.NODE_ENV === 'development') {
  process.on('uncaughtException', async (error) => {
    console.error('💥 [MongoDB] Uncaught exception:', error)
    await disconnectFromDatabase()
    process.exit(1)
  })
  
  process.on('unhandledRejection', async (reason) => {
    console.error('💥 [MongoDB] Unhandled rejection:', reason)
    await disconnectFromDatabase()
    process.exit(1)
  })
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Main connection functions
  connectToDatabase,
  disconnectFromDatabase,
  
  // Status and utility functions
  isConnected,
  getDatabase,
  getConnectionMetrics,
  resetMetrics,
  forceReconnect,
  
  // Type exports for external use
  type ConnectionState,
  type ConnectionOptions,
  type DatabaseMetrics
}

// Default export for convenience
export default connectToDatabase
