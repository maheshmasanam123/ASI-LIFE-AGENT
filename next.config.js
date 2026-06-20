/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: '50mb' },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
      };
    }
    config.externals = [
      ...(config.externals || []),
      { 'node-pty': 'commonjs node-pty' },
      { 'fluent-ffmpeg': 'commonjs fluent-ffmpeg' },
      { 'natural': 'commonjs natural' },
      { 'compromise': 'commonjs compromise' },
      { 'sentiment': 'commonjs sentiment' },
      { '@tensorflow/tfjs-node': 'commonjs @tensorflow/tfjs-node' },
      { 'face-api.js': 'commonjs face-api.js' },
      { 'canvas': 'commonjs canvas' },
      { 'nodemailer': 'commonjs nodemailer' },
      { '@slack/web-api': 'commonjs @slack/web-api' },
      { 'twilio': 'commonjs twilio' },
      { 'pdf-parse': 'commonjs pdf-parse' },
      { 'mammoth': 'commonjs mammoth' },
      { 'xlsx': 'commonjs xlsx' },
      { 'systeminformation': 'commonjs systeminformation' },
      { 'cheerio': 'commonjs cheerio' },
    ];
    // Add path aliases for server-side resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/*': './src/*',
      '@agents/*': './agents/*',
      '@tools/*': './tools/*',
      '@core/*': './core/*',
      '@ui/*': './ui/*',
      '@asi-types/*': './types/*',
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;