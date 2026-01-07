import { describe, expect, it, vi } from "vitest";

/**
 * Tests that resolveId hooks properly skip during Vite's dependency optimization scan phase.
 *
 * When Vite scans for dependencies to optimize, it calls resolveId with `options.scan = true`.
 * Plugins should return early in this case to avoid interfering with dependency discovery,
 * which can cause hard page reloads when new deps are found during navigation.
 *
 * @see https://github.com/remix-run/remix/discussions/8917
 * @see https://github.com/remix-run/remix/pull/9921
 */

describe("resolveId hooks should skip during dep optimization scan", () => {
  describe("platform-specific-resolve", () => {
    it("should return undefined when options.scan is true", async () => {
      // Import the plugin factory
      const { getBaseVitePlugins } = await import("../config/getBaseVitePlugins");
      const plugins = getBaseVitePlugins();

      // Find the platform-specific-resolve plugin
      const plugin = plugins.find(
        (p) =>
          typeof p === "object" &&
          p !== null &&
          "name" in p &&
          p.name === "platform-specific-resolve",
      );

      expect(plugin).toBeDefined();
      if (!plugin || typeof plugin !== "object" || !("resolveId" in plugin)) {
        throw new Error("Plugin not found or missing resolveId");
      }

      const resolveId = plugin.resolveId as Function;

      // Mock the plugin context
      const mockContext = {
        resolve: vi.fn().mockResolvedValue({ id: "/some/path/file.ts" }),
        environment: { name: "client" },
      };

      // When scan is true, should return undefined (skip processing)
      const result = await resolveId.call(mockContext, "some-module", "/importer.ts", {
        scan: true,
      });

      expect(result).toBeUndefined();
      // Should NOT have called resolve when scan is true
      expect(mockContext.resolve).not.toHaveBeenCalled();
    });
  });
});
