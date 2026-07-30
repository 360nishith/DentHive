/** @type {import('next').NextConfig} */
const nextConfig = { 
  output: 'export',
  typescript: { ignoreBuildErrors: true }, 
  eslint: { ignoreDuringBuilds: true }, 
  productionBrowserSourceMaps: false 
}; 
module.exports = nextConfig;