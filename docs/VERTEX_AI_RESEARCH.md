# Google Cloud Vertex AI Virtual Try-On API Research

## API Overview

**Endpoint**: `https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`

**Authentication**: Google Cloud OAuth 2.0 with service account

## Key Differences from LightX API

### 1. Authentication
- **LightX**: API key in headers (`x-api-key`) or AWS V4 signing
- **Vertex AI**: OAuth 2.0 with service account JSON key file
- **Required**: `GOOGLE_APPLICATION_CREDENTIALS` environment variable

### 2. Request Format
- **Content-Type**: `application/json`
- **Authorization**: `Bearer {access_token}`

### 3. Request Structure
```json
{
  "instances": [
    {
      "person_image": {
        "bytes_base64_encoded": "base64_string"
      },
      "garment_image": {
        "bytes_base64_encoded": "base64_string"
      }
    }
  ]
}
```

### 4. Response Structure
```json
{
  "predictions": [
    {
      "generated_image": {
        "bytes_base64_encoded": "base64_string"
      }
    }
  ]
}
```

## Required Dependencies

1. **Google Cloud Authentication Library**:
   ```bash
   npm install @google-cloud/aiplatform
   npm install google-auth-library
   ```

2. **Image Processing**:
   - Convert images to base64
   - Handle image encoding/decoding
   - Optional: Google Cloud Storage integration

## Environment Variables Needed

```env
# Google Cloud Project Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Alternative: Service Account Key as JSON string
GOOGLE_CLOUD_CREDENTIALS_JSON={"type":"service_account",...}

# API Configuration
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_MODEL=virtual-try-on-001
```

## Cost Considerations

- **Pricing**: Pay-per-request model (different from LightX credit system)
- **Quota**: API request limits and rate limiting
- **Region**: Currently limited to `us-central1`

## Implementation Plan

1. **Replace authentication system** from API key to OAuth 2.0
2. **Update image handling** to use base64 encoding instead of URLs
3. **Modify request/response format** to match Vertex AI structure
4. **Add Google Cloud dependencies** and authentication
5. **Update error handling** for Google Cloud error responses
6. **Migrate from URL-based images** to base64-encoded images

## Migration Challenges

1. **Image Storage**: Vertex AI uses base64 - may need to download from ImgBB/LightX URLs and encode
2. **Async Processing**: Need to check if Vertex AI supports async processing like LightX
3. **Quality Options**: Verify available quality settings and options
4. **Rate Limiting**: Different rate limiting approach than LightX
5. **Error Handling**: Google Cloud error format is different

## Next Steps

1. Set up Google Cloud project and enable Vertex AI API
2. Create service account and download credentials
3. Install required dependencies
4. Create new Vertex AI client replacing LightX client
5. Test with sample images
