require('dotenv').config({ path: '.env.local' });

// Print the environment state for debugging
console.log('Environment loaded:', {
  LIGHTX_API_KEY_exists: !!process.env.LIGHTX_API_KEY,
  LIGHTX_API_KEY_length: process.env.LIGHTX_API_KEY?.length,
  IMGBB_API_KEY_exists: !!process.env.IMGBB_API_KEY,
  MONGODB_URI_exists: !!process.env.MONGODB_URI,
  NODE_ENV: process.env.NODE_ENV,
  pwd: process.cwd(),
});
