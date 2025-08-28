# ChangeMass v1.0.0

AI Virtual Outfit Try-On Application using Google Cloud Vertex AI and ImgBB CDN

## 🔹 Overview

ChangeMass is a cutting-edge web application that revolutionizes fashion visualization through AI-powered virtual outfit try-on technology. Upload your favorite clothes and see how they look on your friends using advanced machine learning algorithms.

### Key Features

- **Clothes Collection Management**: Upload, categorize, and search your favorite clothing items
- **Friends Gallery**: Manage friend photos with bulk upload capabilities  
- **AI Virtual Try-On**: Apply clothes to friend photos using Google Cloud Vertex AI
- **Results Gallery**: Browse, download, and share generated try-on images
- **Cloud Storage**: Secure storage via ImgBB CDN and MongoDB Atlas

## 🔹 Technology Stack

- **Frontend**: Next.js 15.4.4, React 18, TypeScript
- **Styling**: Tailwind CSS 3.4.1, Framer Motion 10.18.0
- **Backend**: Next.js API Routes, MongoDB Atlas, Mongoose 8.8.4
- **External APIs**: 
  - Google Cloud Vertex AI Virtual Try-On API
  - ImgBB CDN for image storage
- **Deployment**: Vercel

## 🔹 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MongoDB Atlas account
- Google Cloud project with Vertex AI enabled
- ImgBB API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/moldovancsaba/changemass.git
   cd changemass
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create `.env.local` file in root directory:
   ```env
   GOOGLE_CLOUD_PROJECT_ID=your-google-cloud-project-id
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   IMGBB_API_KEY=your_imgbb_api_key
   MONGODB_URI=your_mongodb_atlas_uri
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔹 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLOUD_PROJECT_ID` | Google Cloud project ID with Vertex AI enabled | ✅ |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google Cloud service account key file | ✅ |
| `IMGBB_API_KEY` | ImgBB API key for image storage | ✅ |
| `MONGODB_URI` | MongoDB Atlas connection string | ✅ |
| `NEXT_PUBLIC_APP_URL` | Application URL | ✅ |

## 🔹 Usage Guide

### Uploading Clothes
1. Navigate to the Clothes section
2. Drag and drop or select clothing images
3. Add metadata (name, category, tags)
4. Images are automatically stored in ImgBB CDN

### Managing Friends
1. Go to the Friends section  
2. Upload friend photos individually or in bulk
3. Add names and organize with tags
4. Photos are securely stored in ImgBB

### Generating Try-Ons
1. Select clothes from your collection
2. Choose friends to apply outfits to
3. Start the AI try-on process
4. View results in the Gallery

## 🔹 API Documentation

### Google Cloud Vertex AI Integration
- **Virtual Try-On API**: AI-powered outfit application using advanced ML models
- **Authentication**: OAuth 2.0 with service account
- **Cost**: Pay-per-request pricing model
- **Output**: Base64-encoded JPEG images

### ImgBB Integration
- **Storage**: Clothes and friend photos
- **CDN**: Fast global image delivery
- **Formats**: JPEG, PNG support

## 🔹 Project Structure

```
changemass/
├── app/
│   ├── api/           # Next.js API routes
│   ├── components/    # React components
│   ├── lib/          # Utility functions and API clients
│   ├── types/        # TypeScript type definitions
│   ├── globals.css   # Global styles
│   ├── layout.tsx    # Root layout component
│   └── page.tsx      # Homepage
├── public/           # Static assets
├── docs/            # Additional documentation
├── .env.local       # Environment variables (not committed)
├── next.config.js   # Next.js configuration
├── tailwind.config.js # Tailwind CSS configuration
└── package.json     # Project dependencies
```

## 🔹 Documentation Links

- [Architecture Overview](./ARCHITECTURE.md)
- [Development Roadmap](./ROADMAP.md)
- [Task Management](./TASKLIST.md)
- [Release Notes](./RELEASE_NOTES.md)
- [Development Learnings](./LEARNINGS.md)

## 🔹 Version Badge

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-development-orange)
![Next.js](https://img.shields.io/badge/Next.js-15.4.4-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## 🔹 Contributing

This is a private project developed by Narimato. All contributions follow the established AI development rules and documentation standards.

## 🔹 License

Private project - All rights reserved.

---

**Last Updated**: 2025-01-24T12:18:16.000Z
**Current Version**: v1.0.0
**Status**: Development Phase
