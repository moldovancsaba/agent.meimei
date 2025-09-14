# 🏗️ ARCHITECTURE.md - ChangeMass v1.3.0

**Last Updated**: 2025-09-14T09:24:28.000Z  
**Status**: Current System Overview

## 🔹 System Architecture Overview

ChangeMass is built as a modern, scalable web application using Next.js 15.4.4 with a microservices approach for external API integrations. The architecture prioritizes performance, reliability, and maintainability.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
├─────────────────────────────────────────────────────────────┤
│  Next.js App Router  │  React Components  │  Tailwind CSS   │
│  - Server Components │  - Client Components│  - Responsive   │
│  - Route Handlers    │  - Framer Motion   │  - Custom Theme │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                         │
├─────────────────────────────────────────────────────────────┤
│     API Routes      │   Business Logic   │   Middleware     │
│  - /api/health      │  - Image Processing│  - Error Handling│
│  - /api/clothes     │  - Try-on Engine   │  - Validation    │
│  - /api/friends     │  - Gallery Manager │  - Authentication│
│  - /api/try-on      │  - Search & Filter │  - Rate Limiting │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   INTEGRATION LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  LightX AI API     │   ImgBB CDN API    │   MongoDB Atlas  │
│  - Image Upload    │   - Image Storage  │   - Data Storage │
│  - Virtual Try-On  │   - CDN Delivery   │   - Collections  │
│  - Error Handling  │   - Bulk Operations│   - Indexing     │
└─────────────────────────────────────────────────────────────┘
```

## 🔹 Component Architecture

### Core Components Location Map

| Component Type | Location | Purpose | Status |
|---------------|----------|---------|---------|
| **Database Models** | `app/lib/models/` | MongoDB schemas with validation | ✅ Started |
| **API Clients** | `app/lib/api/` | External service integrations | 🔄 Planned |
| **UI Components** | `app/components/` | Reusable React components | 🔄 Planned |
| **API Routes** | `app/api/` | Server-side endpoints | ✅ Health Check |
| **Type Definitions** | `app/types/` | TypeScript interfaces | ✅ Complete |
| **Utilities** | `app/lib/` | Helper functions and configs | ✅ MongoDB |

### Database Schema Design

#### ClothingItem Collection
```typescript
{
  _id: ObjectId,
  name: string,
  imageUrl: string,
  imgbbId: string,
  category: {
    id: string,
    name: string,
    slug: string
  },
  tags: Array<{
    id: string,
    name: string,
    color?: string
  }>,
  isFavorite: boolean,
  isActive: boolean,
  uploadedAt: Date,
  updatedAt: Date
}
```

#### Friend Collection
```typescript
{
  _id: ObjectId,
  name: string,
  imageUrl: string,
  imgbbId: string,
  tags: Array<{
    id: string,
    name: string,
    color?: string
  }>,
  isFavorite: boolean,
  isActive: boolean,
  uploadedAt: Date,
  updatedAt: Date
}
```

#### TryOnGeneration Collection
```typescript
{
  _id: ObjectId,
  clothingItem: ObjectId,
  friend: ObjectId,
  generatedImageUrl?: string,
  lightxRequestId?: string,
  status: {
    status: 'pending' | 'processing' | 'completed' | 'failed',
    progress?: number,
    startedAt: Date,
    completedAt?: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### External Service Integration

#### Try-On Engine Selection (Coveralls)
- Primary engine: Replicate (idm-vton by default), with optional REPLICATE_MODEL_COVERALLS override.
- Fallback engine: LightX virtual outfit try-on.
- Selection is category-aware (coveralls/overalls/jumpsuit synonyms) and follows TRYON_BACKEND_PRIORITY env (default replicate,lightx).
- LightX requires LightX-hosted URLs; server auto-uploads to LightX if missing.
- Persistence: TryOnGeneration.engine set to 'replicate' or 'lightx'; generationModel saved for auditability.

### LightX AI API Integration
- **Base URL**: `https://api.lightxeditor.com/external/api/v2/`
- **Authentication**: API Key in headers (`x-api-key`)
- **Rate Limiting**: Implemented in client
- **Error Handling**: Retry mechanism with exponential backoff
- **Cost**: 2 credits per try-on generation

#### Key Endpoints:
1. **Image Upload**: `/uploadImageUrl` - Generate secure upload URLs
2. **Virtual Try-On**: `/ai-virtual-outfit-try-on` - Process outfit application

### ImgBB CDN Integration
- **Base URL**: `https://api.imgbb.com/1/`
- **Authentication**: API Key in query parameters
- **Storage**: Persistent image hosting
- **Features**: Automatic thumbnail generation
- **Management**: Bulk upload, delete operations

### MongoDB Atlas Configuration
- **Connection**: Singleton pattern with connection pooling
- **Database**: `changemass-cluster`
- **Collections**: Automatically created with proper indexing
- **Monitoring**: Health checks and connection status tracking

## 🔹 Security & Performance

### Security Measures
- **Environment Variables**: Secure API key storage
- **Input Validation**: Mongoose schema validation
- **Image Upload**: Validated file types and sizes
- **Error Handling**: Sanitized error responses
- **CORS**: Configured for production deployment

### Performance Optimizations
- **Connection Pooling**: MongoDB connection reuse
- **Image Optimization**: Next.js Image component
- **Caching**: API response caching strategy
- **Indexing**: Database query optimization
- **CDN**: ImgBB for fast image delivery

## 🔹 Development Workflow

### File Structure Standards
```
app/
├── api/                    # API route handlers
│   ├── health/            # System health checks
│   ├── clothes/           # Clothing management
│   ├── friends/           # Friend management
│   └── try-on/            # AI try-on processing
├── components/            # React UI components
│   ├── common/            # Shared components
│   ├── clothes/           # Clothes-specific UI
│   ├── friends/           # Friends-specific UI
│   └── gallery/           # Gallery components
├── lib/                   # Core utilities
│   ├── api/               # External API clients
│   ├── models/            # MongoDB schemas
│   └── utils/             # Helper functions
└── types/                 # TypeScript definitions
```

### Naming Conventions
- **Files**: PascalCase for components (`ClothesGallery.tsx`)
- **Directories**: lowercase with hyphens (`try-on/`)
- **Variables**: camelCase (`imageUrl`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- **Database Fields**: camelCase with descriptive names

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js configuration with custom rules
- **Comments**: Function purpose and strategic justification
- **Error Handling**: Comprehensive try-catch with logging
- **Testing**: Manual testing protocols (no unit tests per rules)

## 🔹 Deployment Architecture

### Vercel Configuration
- **Framework**: Next.js with App Router
- **Build Command**: `npm run build`
- **Environment Variables**: Configured in dashboard
- **Domain**: Custom domain support
- **Analytics**: Built-in performance monitoring

### Environment Management
```env
# Production Environment Variables
LIGHTX_API_KEY=production_key
IMGBB_API_KEY=production_key
MONGODB_URI=mongodb+srv://production_cluster
NEXT_PUBLIC_APP_URL=https://changemass.vercel.app
NODE_ENV=production
```

## 🔹 Monitoring & Health Checks

### System Monitoring
- **Health Endpoint**: `/api/health` - Comprehensive system status
- **Database Monitoring**: Connection state and query performance
- **API Monitoring**: External service availability
- **Error Tracking**: Centralized error logging

### Key Metrics Tracked
- Database connection status
- API response times
- Image processing success rates
- Storage usage (ImgBB)
- User interaction patterns

## 🔹 Scalability Considerations

### Horizontal Scaling
- **Stateless Design**: No server-side sessions
- **Database Sharding**: MongoDB Atlas auto-scaling
- **CDN Distribution**: Global image delivery
- **API Rate Limiting**: Request throttling

### Future Enhancements
- **Caching Layer**: Redis for session management
- **Background Jobs**: Queue system for batch processing
- **Analytics**: User behavior tracking
- **API Versioning**: Backward compatibility

---

**Architecture Status**: Production-ready foundation  
**Next Phase**: Core feature implementation  
**Dependencies**: All external services verified and operational
