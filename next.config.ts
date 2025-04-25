import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'export',
  basePath: '/dataform',
  assetPrefix: '/dataform/',
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
