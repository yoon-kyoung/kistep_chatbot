import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  ...(isGithubPages
    ? {
        output: "export",
        basePath: "/kistep_chatbot",
        assetPrefix: "/kistep_chatbot/",
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
