/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Add ONNX as a binary file type
    config.module.rules.push({
      test: /\.onnx$/,
      type: 'asset/resource',
    });
    
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Add ONNX to the list of allowed server actions
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
      allowedFormActions: ['localhost:3000'],
    },
  },
};

export default nextConfig;
