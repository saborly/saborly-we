/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a second dev/build instance run with its own output dir (e.g. NEXT_DIST_DIR=.next-visual) without
  // fighting over .next locks.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The Docker build sets NEXT_OUTPUT=standalone for a small self-contained server; unset elsewhere.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
