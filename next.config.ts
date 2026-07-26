import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Harici diskdə köhnə `.next` faylları macOS tərəfindən kilidlənə bilir.
  // Lokal yoxlama ayrıca qovluq seçə bilər; Vercel dəyişən vermədiyi üçün
  // istehsalda standart `.next` istifadə olunmağa davam edir.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
