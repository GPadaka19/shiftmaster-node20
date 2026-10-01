import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Local development runs behind EnvKit at https://shiftmaster.test
  allowedDevOrigins: ["shiftmaster.test"],
};

export default nextConfig;
