'use client'

import Navigation from '../components/layout/Navigation'
import PeopleUpload from '../components/people/PeopleUpload'

export default function UploadPeoplePage() {
  const handleUploadComplete = (person: any) => {
    console.log('Person uploaded:', person)
    // Could show a success toast or redirect
  }

  const handleCancel = () => {
    // Could redirect to home or previous page
    console.log('Upload cancelled')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <PeopleUpload 
        onUploadComplete={handleUploadComplete}
        onCancel={handleCancel}
      />
    </div>
  )
}
