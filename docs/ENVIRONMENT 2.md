# Environment Variables Documentation

This document outlines all environment variables required for the ChangeMass application.

## Required Environment Variables

### LightX AI Try-On API
- `LIGHTX_API_KEY`: API key for LightX virtual try-on service
  - Used in: `/app/api/try-on/route.ts`
  - Format: String
  - Example: `94b5b35ca92f4630b475d110ed861e8d_2d00ce0e2e1745779214dc63d9755e43_andoraitools`

### ImgBB CDN
- `IMGBB_API_KEY`: API key for ImgBB image hosting
  - Used in: `/app/lib/api/imgbb.ts`
  - Format: String
  - Example: `0f1b0fe82d360879dc65778de2697b50`

### MongoDB Atlas
- `MONGODB_URI`: Connection string for MongoDB Atlas database
  - Used in: `/app/lib/db/mongodb.ts`
  - Format: MongoDB URI string
  - Example: `mongodb+srv://username:password@cluster.example.net/?retryWrites=true&w=majority`

### Application Configuration
- `NEXT_PUBLIC_APP_URL`: Public URL where the app is hosted
  - Used in: Various client-side components
  - Format: URL string
  - Example: `http://localhost:3000` (development) or `https://your-domain.com` (production)

## Setup Instructions

1. Create a `.env.local` file in the project root
2. Copy the contents of `.env.example`
3. Fill in your actual values for each variable
4. Restart the development server if it's running

## Security Notes

- Never commit `.env.local` to version control
- Keep your API keys secure and rotate them periodically
- Use different API keys for development and production
- Monitor API usage and set up alerts for unusual activity

## Troubleshooting

If environment variables aren't loading:

1. Verify the `.env.local` file exists in the project root
2. Check that all required variables are properly set
3. Ensure there are no spaces around the = sign in variable definitions
4. Restart the development server after any changes
5. For production, make sure variables are set in your hosting platform
