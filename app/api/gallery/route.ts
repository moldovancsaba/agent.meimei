/**
 * Gallery API Route
 * 
 * Fetches completed try-on generations for display in the gallery
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongodb'
import TryOnGeneration from '@/app/lib/models/TryOnGeneration'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase()

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '12', 10)
    const favorites = searchParams.get('favorites') === 'true'

    console.log(`🖼️ Fetching gallery items (page ${page}, limit ${limit})`)

    // Build query
    const query: any = {
      isPublic: true,
      'status.status': 'completed'
    }

    if (favorites) {
      query.isFavorite = true
    }

    // Get total count for pagination
    const total = await TryOnGeneration.countDocuments(query)
    const totalPages = Math.ceil(total / limit)

    // Fetch generations with populated data
    const generations = await TryOnGeneration.find(query)
      .populate('person', 'name imageUrl')
      .populate('clothingItem', 'name imageUrl category')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean()

    console.log(`✅ Found ${generations.length} gallery items (${total} total)`)

    // Format response
    const formattedGenerations = generations.map((gen: any) => ({
      id: gen._id,
      generatedImageUrl: gen.generatedImageUrl,
      person: {
        name: gen.person?.name || 'Unknown Person',
        imageUrl: gen.person?.imageUrl
      },
      clothingItem: {
        name: gen.clothingItem?.name || 'Unknown Clothing',
        imageUrl: gen.clothingItem?.imageUrl,
        category: gen.clothingItem?.category
      },
      processingTimeMs: gen.processingTimeMs,
      quality: gen.quality,
      style: gen.style,
      isFavorite: gen.isFavorite,
      createdAt: gen.createdAt
    }))

    return NextResponse.json({
      success: true,
      data: formattedGenerations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    console.error('❌ Failed to fetch gallery items:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch gallery items',
        data: [],
        pagination: {
          page: 1,
          limit: 12,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase()

    const body = await req.json()
    const { id, isFavorite } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Generation ID is required' },
        { status: 400 }
      )
    }

    const generation = await TryOnGeneration.findByIdAndUpdate(
      id,
      { isFavorite },
      { new: true }
    )

    if (!generation) {
      return NextResponse.json(
        { success: false, error: 'Generation not found' },
        { status: 404 }
      )
    }

    console.log(`✅ Updated generation ${id} favorite status: ${isFavorite}`)

    return NextResponse.json({
      success: true,
      data: { id, isFavorite }
    })

  } catch (error) {
    console.error('❌ Failed to update generation:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to update generation' },
      { status: 500 }
    )
  }
}
