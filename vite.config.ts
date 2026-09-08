import vinext from "vinext";
import { defineConfig } from "vite";

export default defineConfig(async () => {
  const { cloudflare } = await import("@cloudflare/vite-plugin");
  return {
    plugins: [
      vinext(),
      cloudflare({ configPath: "./wrangler.json", viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] }, inspectorPort: false }),
    ],
  };
});
