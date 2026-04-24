import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  basePath: '/temp-core',
  assetPrefix: '/temp-core/',
  trailingSlash: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;