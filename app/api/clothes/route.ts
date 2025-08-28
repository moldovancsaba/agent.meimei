/**
 * Clothes Management API Routes
 * 
 * Handles CRUD operations for clothing items including:
 * - GET: Fetch clothes with filtering, pagination, and search
 * - POST: Create new clothing items with dual CDN upload
 * - PUT: Update existing clothing items
 * - DELETE: Soft delete clothing items
 */

import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '../../lib/mongodb'
import ClothingItem from '../../lib/models/ClothingItem'
import { uploadToBothCDNs, ImgBBUploadResponse } from '../../lib/api'
import { ClothingItemDocument, PaginationParams, FilterParams } from '../../types/models'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// TYPES
// ============================================================================

interface CreateClothingRequest {
  name: string
  description?: string
  category: {
    id: string
    name: string
    slug: string
  }
  tags?: Array<{
    id: string
    name: string
    color?: string
  }>
  color?: string
  size?: string
  brand?: string
  season?: 'spring' | 'summer' | 'autumn' | 'winter' | 'all-season'
  imageData: string // base64 encoded image
  fileName: string
}

interface UpdateClothingRequest {
  name?: string
  description?: string
  category?: {
    id: string
    name: string
    slug: string
  }
  tags?: Array<{
    id: string
    name: string
    color?: string
  }>
  color?: string
  size?: string
  brand?: string
  season?: 'spring' | 'summer' | 'autumn' | 'winter' | 'all-season'
  isFavorite?: boolean
  isActive?: boolean
}

// ============================================================================
// GET: Fetch clothes with filtering and pagination
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50) // Max 50 items per page
    const skip = (page - 1) * limit

    // Parse filter parameters
    const category = searchParams.get('category')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const search = searchParams.get('search')
    const isFavorite = searchParams.get('favorite') === 'true'
    const season = searchParams.get('season')
    const size = searchParams.get('size')
    const brand = searchParams.get('brand')
    const sortBy = searchParams.get('sortBy') || 'uploadedAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1

    // Build query
    const query: any = { isActive: true }

    if (category) {
      query['category.slug'] = category
    }

    if (tags && tags.length > 0) {
      query['tags.name'] = { $in: tags }
    }

    if (search) {
      query.$text = { $search: search }
    }

    if (isFavorite) {
      query.isFavorite = true
    }

    if (season) {
      query.season = season
    }

    if (size) {
      query.size = size
    }

    if (brand) {
      query.brand = new RegExp(brand, 'i') // Case-insensitive search
    }

    console.log('🔍 Fetching clothes with query:', JSON.stringify(query))

    // Execute query with pagination
    const [clothes, totalCount] = await Promise.all([
      ClothingItem.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      ClothingItem.countDocuments(query)
    ])

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    console.log(`✅ Found ${clothes.length} clothes (${totalCount} total)`)

    return NextResponse.json({
      success: true,
      data: clothes,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      filters: {
        category,
        tags,
        search,
        isFavorite,
        season,
        size,
        brand,
        sortBy,
        sortOrder: sortOrder === 1 ? 'asc' : 'desc'
      }
    }, { status: 200 })

  } catch (error) {
    console.error('❌ GET /api/clothes error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch clothes',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================================================
// POST: Create new clothing item
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await connectToDatabase()

    const body: CreateClothingRequest = await request.json()
    
    console.log('📤 Creating new clothing item:', body.name)

    // Validate required fields
    if (!body.name || !body.category || !body.imageData || !body.fileName) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, category, imageData, fileName'
      }, { status: 400 })
    }

    // Convert base64 to File object
    const imageBuffer = Buffer.from(body.imageData.split(',')[1], 'base64')
    const mimeType = body.imageData.split(',')[0].split(':')[1].split(';')[0]
    
    // Create File-like object for upload
    const imageBlob = new Blob([imageBuffer], { type: mimeType })
    const imageFile = new File([imageBlob], body.fileName, { type: mimeType })

    console.log('🔄 Uploading image to dual CDN...', {
      fileName: body.fileName,
      size: imageFile.size,
      type: mimeType
    })

    // Upload to both CDNs
    const uploadResult = await uploadToBothCDNs(imageFile, body.name)

    console.log('✅ Image uploaded successfully')
    console.log('📦 ImgBB URL:', uploadResult.permanent_url)
    console.log('⚡ LightX URL:', uploadResult.processing_url)

    // Generate IDs for category and tags if not provided
    const categoryWithId = {
      ...body.category,
      id: body.category.id || uuidv4()
    }

    const tagsWithIds = body.tags?.map(tag => ({
      ...tag,
      id: tag.id || uuidv4()
    })) || []

    // Create clothing item in database
    const clothingItem = new ClothingItem({
      name: body.name,
      description: body.description,
      imageUrl: uploadResult.permanent_url,
      thumbnailUrl: uploadResult.imgbb.data.thumb?.url || uploadResult.permanent_url,
      lightxUrl: uploadResult.processing_url, // Save LightX URL for AI processing
      imgbbId: uploadResult.imgbb.data.id,
      category: categoryWithId,
      tags: tagsWithIds,
      color: body.color?.trim() || undefined,
      size: body.size?.trim() || undefined, // Only set if not empty
      brand: body.brand?.trim() || undefined,
      season: body.season || 'all-season',
      isFavorite: false,
      isActive: true
    })

    const savedItem = await clothingItem.save()

    console.log('✅ Clothing item saved to database:', savedItem._id)

    // Return the created item
    return NextResponse.json({
      success: true,
      data: savedItem,
      message: 'Clothing item created successfully',
      upload_info: {
        permanent_url: uploadResult.permanent_url,
        processing_url: uploadResult.processing_url,
        imgbb_id: uploadResult.imgbb.data.id
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ POST /api/clothes error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create clothing item',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================================================
// PUT: Update existing clothing item
// ============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('id')

    if (!itemId) {
      return NextResponse.json({
        success: false,
        error: 'Item ID is required'
      }, { status: 400 })
    }

    const body: UpdateClothingRequest = await request.json()
    
    console.log('🔄 Updating clothing item:', itemId)

    // Find and update the item
    const updatedItem = await ClothingItem.findByIdAndUpdate(
      itemId,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )

    if (!updatedItem) {
      return NextResponse.json({
        success: false,
        error: 'Clothing item not found'
      }, { status: 404 })
    }

    console.log('✅ Clothing item updated successfully')

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: 'Clothing item updated successfully'
    }, { status: 200 })

  } catch (error) {
    console.error('❌ PUT /api/clothes error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update clothing item',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================================================
// DELETE: Soft delete clothing item
// ============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('id')

    if (!itemId) {
      return NextResponse.json({
        success: false,
        error: 'Item ID is required'
      }, { status: 400 })
    }

    console.log('🗑️ Soft deleting clothing item:', itemId)

    // Soft delete by setting isActive to false
    const deletedItem = await ClothingItem.findByIdAndUpdate(
      itemId,
      { 
        isActive: false, 
        updatedAt: new Date() 
      },
      { new: true }
    )

    if (!deletedItem) {
      return NextResponse.json({
        success: false,
        error: 'Clothing item not found'
      }, { status: 404 })
    }

    console.log('✅ Clothing item soft deleted successfully')

    return NextResponse.json({
      success: true,
      data: { id: itemId },
      message: 'Clothing item deleted successfully'
    }, { status: 200 })

  } catch (error) {
    console.error('❌ DELETE /api/clothes error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete clothing item',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
