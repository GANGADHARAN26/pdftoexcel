import CopyPlugin from "copy-webpack-plugin";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  },
  serverExternalPackages: [
    "pdf-parse",
    "exceljs",
    "canvas",
    "sharp",
    "tesseract.js",
    "pdf2pic",
    "pdfjs-dist",
    "pdf-to-png-converter",
  ],
  webpack: (config, { isServer }) => {
    // Exclude canvas from client-side bundle, but keep it for server-side
    if (!isServer) {
      config.resolve.alias.canvas = false;
    }

    // Copy the PDF worker to the public directory
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(
              __dirname,
              "node_modules/pdfjs-dist/build/pdf.worker.mjs"
            ),
            to: path.resolve(__dirname, "public"),
          },
          // For Tesseract.js - copy worker and core files
          {
            from: path.resolve(
              __dirname,
              "node_modules/tesseract.js/dist/worker.min.js"
            ),
            to: path.resolve(__dirname, "public/tesseract/"),
          },
          {
            from: path.resolve(__dirname, "node_modules/tesseract.js-core/"),
            to: path.resolve(__dirname, "public/tesseract/"),
          },
        ],
      })
    );

    return config;
  },
};

export default nextConfig;
