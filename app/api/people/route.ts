/**
 * People API Endpoint
 * 
 * Handles CRUD operations for person profiles including:
 * - Upload people/model photos with metadata
 * - Dual CDN upload (ImgBB + LightX)
 * - MongoDB storage with person profiles
 * - Pagination and filtering
 */

import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '../../lib/mongodb'
import Person from '../../lib/models/Person'
import { uploadToBothCDNs, ImgBBUploadResponse } from '../../lib/api'
import { PersonDocument, PaginationParams, FilterParams } from '../../types/models'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// POST - CREATE NEW PERSON
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔄 Processing person upload request...')
    
    // Parse request body
    const body = await request.json()
    const {
      name,
      nickname,
      description,
      imageData,
      fileName,
      tags = [],
      age,
      gender,
      bodyType,
      skinTone,
      hairColor,
      eyeColor,
      isFavorite = false
    } = body

    // Validate required fields
    if (!name || !imageData || !fileName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: name, imageData, and fileName are required' 
        },
        { status: 400 }
      )
    }

    // Connect to database
    await connectToDatabase()

    // Convert base64 to File object
    const base64Data = imageData.split(',')[1] || imageData
    const buffer = Buffer.from(base64Data, 'base64')
    // Convert Buffer -> ArrayBuffer for strict Blob/File typing in Node + TS DOM libs
    // Allocate a fresh ArrayBuffer (not SharedArrayBuffer) and copy bytes to ensure
    // compatibility with lib.dom's BlobPart (expects ArrayBuffer or ArrayBufferView<ArrayBuffer>).
    const ab = new ArrayBuffer(buffer.byteLength)
    new Uint8Array(ab).set(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength))
    const file = new File([ab], fileName, { type: 'image/jpeg' })

    console.log(`📤 Uploading person image: ${name} (${fileName})`)

    // Upload to both CDNs
    const uploadResult = await uploadToBothCDNs(file, `person_${name.replace(/\s+/g, '_').toLowerCase()}`)

    console.log('✅ Dual CDN upload successful')

    // Create person document
    const personData: Partial<PersonDocument> = {
      name,
      nickname: nickname || undefined,
      description: description || undefined,
      imageUrl: uploadResult.permanent_url,
      thumbnailUrl: uploadResult.imgbb.data.thumb.url,
      lightxUrl: uploadResult.processing_url, // Save LightX URL for AI processing
      imgbbId: uploadResult.imgbb.data.id,
      tags: tags || [],
      age: age ? parseInt(age) : undefined,
      gender: gender?.trim() || undefined, // Only set if not empty
      bodyType: bodyType?.trim() || undefined, // Only set if not empty
      skinTone: skinTone?.trim() || undefined, // Only set if not empty
      hairColor: hairColor?.trim() || undefined,
      eyeColor: eyeColor?.trim() || undefined,
      isFavorite,
      isActive: true,
      uploadedAt: new Date(),
      updatedAt: new Date()
    }

    // Save to MongoDB
    const person = new Person(personData)
    const savedPerson = await person.save()

    console.log('✅ Person saved to database:', savedPerson._id)

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Person uploaded successfully',
      data: {
        _id: savedPerson._id,
        name: savedPerson.name,
        nickname: savedPerson.nickname,
        description: savedPerson.description,
        imageUrl: savedPerson.imageUrl,
        thumbnailUrl: savedPerson.thumbnailUrl,
        imgbbId: savedPerson.imgbbId,
        tags: savedPerson.tags,
        age: savedPerson.age,
        gender: savedPerson.gender,
        bodyType: savedPerson.bodyType,
        skinTone: savedPerson.skinTone,
        hairColor: savedPerson.hairColor,
        eyeColor: savedPerson.eyeColor,
        isFavorite: savedPerson.isFavorite,
        isActive: savedPerson.isActive,
        uploadedAt: savedPerson.uploadedAt,
        updatedAt: savedPerson.updatedAt,
        // Additional metadata for AI processing
        lightxUrl: uploadResult.processing_url,
        cdnMetadata: {
          imgbb: uploadResult.imgbb.data,
          lightx: uploadResult.lightx
        }
      }
    })

  } catch (error) {
    console.error('❌ Person upload error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload person',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - RETRIEVE PEOPLE WITH PAGINATION AND FILTERING
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔍 Retrieving people...')
    
    await connectToDatabase()

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const sortBy = searchParams.get('sortBy') || 'uploadedAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1
    const search = searchParams.get('search')
    const gender = searchParams.get('gender')
    const bodyType = searchParams.get('bodyType')
    const skinTone = searchParams.get('skinTone')
    const isFavorite = searchParams.get('isFavorite')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)

    // Build filter query
    const filter: any = { isActive: true }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nickname: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }

    if (gender) filter.gender = gender
    if (bodyType) filter.bodyType = bodyType
    if (skinTone) filter.skinTone = skinTone
    if (isFavorite !== null) filter.isFavorite = isFavorite === 'true'
    if (tags && tags.length > 0) {
      filter['tags.id'] = { $in: tags }
    }

    // Execute query with pagination
    const skip = (page - 1) * limit
    const totalPeople = await Person.countDocuments(filter)
    const people = await Person.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean()

    console.log(`✅ Retrieved ${people.length} people (page ${page}/${Math.ceil(totalPeople / limit)})`)

    return NextResponse.json({
      success: true,
      data: people,
      pagination: {
        page,
        limit,
        total: totalPeople,
        totalPages: Math.ceil(totalPeople / limit),
        hasNextPage: page < Math.ceil(totalPeople / limit),
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    console.error('❌ People retrieval error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to retrieve people' 
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT - UPDATE PERSON
// ============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔄 Updating person...')
    
    const body = await request.json()
    const { _id, ...updateData } = body

    if (!_id) {
      return NextResponse.json(
        { success: false, error: 'Person ID is required for updates' },
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Update person document
    const updatedPerson = await Person.findByIdAndUpdate(
      _id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    )

    if (!updatedPerson) {
      return NextResponse.json(
        { success: false, error: 'Person not found' },
        { status: 404 }
      )
    }

    console.log('✅ Person updated successfully:', updatedPerson._id)

    return NextResponse.json({
      success: true,
      message: 'Person updated successfully',
      data: updatedPerson
    })

  } catch (error) {
    console.error('❌ Person update error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update person' 
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - REMOVE PERSON (SOFT DELETE)
// ============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🗑️ Deleting person...')
    
    const { searchParams } = new URL(request.url)
    const personId = searchParams.get('id')

    if (!personId) {
      return NextResponse.json(
        { success: false, error: 'Person ID is required for deletion' },
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Soft delete (mark as inactive)
    const deletedPerson = await Person.findByIdAndUpdate(
      personId,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    )

    if (!deletedPerson) {
      return NextResponse.json(
        { success: false, error: 'Person not found' },
        { status: 404 }
      )
    }

    console.log('✅ Person deleted successfully:', deletedPerson._id)

    return NextResponse.json({
      success: true,
      message: 'Person deleted successfully',
      data: { _id: deletedPerson._id }
    })

  } catch (error) {
    console.error('❌ Person deletion error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete person' 
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// OPTIONS - CORS PREFLIGHT
// ============================================================================

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
