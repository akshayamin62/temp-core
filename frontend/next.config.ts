import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  basePath: '/temp-core',
  assetPrefix: '/temp-core/',
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;