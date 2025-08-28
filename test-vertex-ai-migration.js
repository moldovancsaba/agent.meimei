#!/usr/bin/env node

/**
 * Vertex AI Migration Test Script
 * 
 * This script tests the migrated Vertex AI integration to ensure it works
 * correctly and provides equivalent functionality to the previous LightX implementation.
 */

const axios = require('axios')
require('dotenv').config({ path: '.env.local' })

const BASE_URL = 'http://localhost:3000'

/**
 * Check Google Cloud environment variables
 */
function checkEnvironmentVariables() {
  console.log('🔍 Checking Google Cloud environment variables...')
  
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS_JSON
  
  console.log(`📋 Project ID: ${projectId ? '✅ Set' : '❌ Missing'}`)
  console.log(`📋 Credentials Path: ${credentialsPath ? '✅ Set' : '❌ Missing'}`)
  console.log(`📋 Credentials JSON: ${credentialsJson ? '✅ Set' : '❌ Missing'}`)
  
  if (!projectId) {
    console.error('❌ GOOGLE_CLOUD_PROJECT_ID is required for Vertex AI')
    return false
  }
  
  if (!credentialsPath && !credentialsJson) {
    console.error('❌ Either GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_CREDENTIALS_JSON is required')
    return false
  }
  
  console.log('✅ Environment variables look good!')
  return true
}

/**
 * Test try-on endpoint with mock data
 */
async function testTryOnEndpoint() {
  console.log('\n🎭 Testing try-on endpoint with Vertex AI...')
  
  // Create mock person and clothing objects using publicly accessible images
  const mockPerson = {
    _id: 'test-person-id',
    name: 'Test Person',
    nickname: 'Tester',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop', // Sample person image
    // No lightxUrl - will use imageUrl
  }
  
  const mockClothing = {
    _id: 'test-clothing-id',
    name: 'Test Shirt',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=600&fit=crop', // Sample clothing image
    // No lightxUrl - will use imageUrl
  }
  
  try {
    console.log('📤 Sending request to try-on endpoint...')
    
    const response = await axios.post(`${BASE_URL}/api/try-on`, {
      person: mockPerson,
      clothing: mockClothing
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000, // 2 minutes for Vertex AI processing
      validateStatus: () => true
    })
    
    console.log(`📊 Try-on Status: ${response.status}`)
    
    if (response.status === 200) {
      console.log('🎉 Try-on request succeeded!')
      const result = response.data
      
      console.log('📄 Response structure:')
      console.log(`   - Success: ${result.success}`)
      console.log(`   - Request ID: ${result.requestId}`)
      console.log(`   - Processing Time: ${result.processingTimeMs}ms`)
      console.log(`   - Generated Image: ${result.generatedImageBase64 ? 'Present (base64)' : 'Missing'}`)
      
      if (result.generatedImageBase64) {
        console.log(`   - Image Size: ${result.generatedImageBase64.length} characters`)
        console.log('✅ Vertex AI integration working correctly!')
        return true
      } else {
        console.log('❌ No generated image in response')
        return false
      }
    } else {
      console.log(`⚠️  Try-on request returned ${response.status}:`, response.data)
      
      // Analyze the error
      if (response.data?.error) {
        const error = response.data.error.toLowerCase()
        if (error.includes('google cloud') || error.includes('vertex ai')) {
          console.log('🔍 This appears to be a Google Cloud configuration issue')
        } else if (error.includes('authentication') || error.includes('credentials')) {
          console.log('🔍 This appears to be an authentication issue')
        } else if (error.includes('quota') || error.includes('rate limit')) {
          console.log('🔍 This appears to be a quota or rate limiting issue')
        } else {
          console.log('🔍 This appears to be a different issue')
        }
      }
      
      return false
    }
    
  } catch (error) {
    console.error('❌ Try-on test failed:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Make sure the development server is running: npm run dev')
    }
    
    return false
  }
}

/**
 * Test the build system
 */
async function testBuild() {
  console.log('\n🏗️ Testing build system...')
  
  try {
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)
    
    console.log('🔄 Running npm run build...')
    const { stdout, stderr } = await execAsync('npm run build', {
      cwd: process.cwd(),
      timeout: 120000 // 2 minutes
    })
    
    if (stderr && !stderr.includes('warn')) {
      console.error('❌ Build failed:')
      console.error(stderr)
      return false
    }
    
    console.log('✅ Build successful!')
    return true
    
  } catch (error) {
    console.error('❌ Build test failed:', error.message)
    return false
  }
}

/**
 * Check if the development server is running
 */
async function checkServerRunning() {
  console.log('🔍 Checking if development server is running...')
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`, {
      timeout: 5000
    })
    
    if (response.status === 200) {
      console.log('✅ Development server is running')
      return true
    }
  } catch (error) {
    console.error('❌ Development server is not running')
    console.error('   Please start it with: npm run dev')
    return false
  }
  
  return false
}

/**
 * Main test runner
 */
async function runMigrationTests() {
  console.log('🧪 Testing Vertex AI Migration')
  console.log('=' .repeat(60))
  
  // Check environment variables
  const envOk = checkEnvironmentVariables()
  if (!envOk) {
    console.log('\n❌ Environment setup incomplete. Please configure Google Cloud credentials.')
    console.log('\nNext steps:')
    console.log('1. Set up a Google Cloud project and enable Vertex AI API')
    console.log('2. Create a service account and download the key file')
    console.log('3. Set environment variables in .env.local:')
    console.log('   GOOGLE_CLOUD_PROJECT_ID=your-project-id')
    console.log('   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json')
    process.exit(1)
  }
  
  // Test build system
  const buildOk = await testBuild()
  
  // Check if server is running
  const serverRunning = await checkServerRunning()
  if (!serverRunning) {
    console.log('\n⚠️  Cannot test API endpoints - development server is not running')
    console.log('Please start the server with: npm run dev')
  } else {
    // Test try-on endpoint
    const tryonOk = await testTryOnEndpoint()
    
    console.log('\n' + '=' .repeat(60))
    console.log('🏁 Migration Test Results:')
    console.log(`🔧 Environment Setup: ${envOk ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`🏗️ Build System: ${buildOk ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`🎭 Try-on API: ${tryonOk ? '✅ PASS' : '❌ FAIL'}`)
    
    if (envOk && buildOk && tryonOk) {
      console.log('\n🎉 SUCCESS! Vertex AI migration is working correctly!')
      console.log('\nNext steps:')
      console.log('1. Upload some actual clothes and people through the web interface')
      console.log('2. Test the virtual try-on functionality with real data')
      console.log('3. Monitor Google Cloud usage and costs')
    } else {
      console.log('\n⚠️  Migration has issues - please check the test results above')
    }
  }
  
  console.log('=' .repeat(60))
}

// Run the tests
runMigrationTests().catch(error => {
  console.error('💥 Migration test runner failed:', error)
  process.exit(1)
})
