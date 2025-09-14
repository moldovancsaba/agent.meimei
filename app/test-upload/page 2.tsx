'use client'

import { useState } from 'react'
import ClothesUpload from '../components/clothes/ClothesUpload'

export default function TestClothesUpload() {
  const [uploadedItems, setUploadedItems] = useState<any[]>([])

  const handleUploadComplete = (items: any | any[]) => {
    const itemsArray = Array.isArray(items) ? items : [items]
    setUploadedItems(prev => [...prev, ...itemsArray])
    console.log('Upload completed:', items)
  }

  const handleCancel = () => {
    console.log('Upload cancelled')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 text-center">
            Test Clothes Upload Component
          </h1>
          <p className="text-gray-600 text-center mt-2">
            Testing the comprehensive clothing upload interface
          </p>
        </div>

        <ClothesUpload
          onUploadComplete={handleUploadComplete}
          onCancel={handleCancel}
        />

        {uploadedItems.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Uploaded Items</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadedItems.map((item, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-4">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="w-full h-48 object-cover rounded"
                  />
                  <h3 className="font-semibold mt-2">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.category.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.tags.map((tag: any) => tag.name).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
