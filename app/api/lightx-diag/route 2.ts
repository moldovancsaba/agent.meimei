/**
 * LightX Integration Diagnostic API
 * 
 * Checks the LightX integration status of all items in the database.
 * Helps identify items that need to be re-uploaded.
 */

import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '../../lib/mongodb'
import ClothingItem from '../../lib/models/ClothingItem'
import Person from '../../lib/models/Person'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const [clothes, people] = await Promise.all([
      ClothingItem.find({ isActive: true }).select('_id name imageUrl lightxUrl').lean(),
      Person.find({ isActive: true }).select('_id name nickname imageUrl lightxUrl').lean()
    ])
    
    const clothesStatus = clothes.map(item => ({
      id: item._id,
      name: item.name,
      hasLightX: !!item.lightxUrl,
      imageUrl: item.imageUrl,
      lightxUrl: item.lightxUrl
    }))
    
    const peopleStatus = people.map(item => ({
      id: item._id,
      name: item.nickname || item.name,
      hasLightX: !!item.lightxUrl,
      imageUrl: item.imageUrl,
      lightxUrl: item.lightxUrl
    }))
    
    const clothesMissingLightX = clothesStatus.filter(item => !item.hasLightX)
    const peopleMissingLightX = peopleStatus.filter(item => !item.hasLightX)
    
    return NextResponse.json({
      success: true,
      data: {
        clothes: {
          total: clothes.length,
          withLightX: clothesStatus.filter(item => item.hasLightX).length,
          missing: clothesMissingLightX
        },
        people: {
          total: people.length,
          withLightX: peopleStatus.filter(item => item.hasLightX).length,
          missing: peopleMissingLightX
        }
      }
    })
    
  } catch (error) {
    console.error('❌ LightX diagnostic error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check LightX status'
    }, { status: 500 })
  }
}
