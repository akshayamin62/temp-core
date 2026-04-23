import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  basePath: '/temp-core',
  assetPrefix: '/temp-core/',
  env: {
    NEXT_PUBLIC_API_URL: 'https://admitra.io/temp-core/api',
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

