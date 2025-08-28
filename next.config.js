/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'i.ibb.co', // ImgBB CDN
      'd3aa3s3yhl0emm.cloudfront.net', // LightX CDN
      'lightx-ai-version-2.s3-accelerate.amazonaws.com', // LightX S3
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'd3aa3s3yhl0emm.cloudfront.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lightx-ai-version-2.s3-accelerate.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
  serverExternalPackages: ['mongoose'],
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['pages', 'app', 'components', 'lib', 'src'],
  },
}

module.exports = nextConfig
