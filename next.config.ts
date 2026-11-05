import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // En el taller (sandbox) se empaqueta standalone para servir rápido;
  // en Vercel la plataforma usa su propio emplatado, así que ahí NO se
  // genera el paquete standalone.
  output: process.env.VERCEL ? undefined : "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["*.space-z.ai"],
  devIndicators: false,
};

export default nextConfig;
