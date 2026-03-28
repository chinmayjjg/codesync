import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["package/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["package/client/**/*.ts", "package/client/**/*.tsx"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "package/client"),
      "@codesync/shared": path.resolve(__dirname, "package/shared/src/index.ts"),
    },
  },
});
