import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

// MDX powers the /system documentation sections. Plugins are named as strings so
// the same config works under Turbopack, which cannot serialise plugin functions.
const withMDX = createMDX({
  options: {
    remarkPlugins: [["remark-gfm"]],
  },
});

export default withMDX(nextConfig);
