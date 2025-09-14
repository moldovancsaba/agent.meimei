'use client'

import Navigation from '../components/layout/Navigation'
import ClothesUpload from '../components/clothes/ClothesUpload'

export default function UploadClothesPage() {
  const handleUploadComplete = (clothingItem: any) => {
    console.log('Clothing item uploaded:', clothingItem)
    // Could show a success toast or redirect
  }

  const handleCancel = () => {
    // Could redirect to home or previous page
    console.log('Upload cancelled')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <ClothesUpload 
        onUploadComplete={handleUploadComplete}
        onCancel={handleCancel}
      />
    </div>
  )
}
