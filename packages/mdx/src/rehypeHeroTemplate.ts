import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import visit from "unist-util-visit";

export type RehypeHeroTemplateOptions = {
  demosPackage?: string; // package name to resolve (e.g. '@tamagui/demos')
  demosPath?: string; // or direct path to demos directory
};

export const rehypeHeroTemplate = (options: RehypeHeroTemplateOptions = {}) => {
  let demosRoot: string;

  if (options.demosPath) {
    demosRoot = options.demosPath;
  } else if (options.demosPackage) {
    // @ts-ignore
    const requireFn = typeof require === "undefined" ? createRequire(import.meta.url) : require;
    const resolved = requireFn.resolve(options.demosPackage);
    demosRoot = path.join(resolved, "..", "..", "..");
  } else {
    throw new Error("rehypeHeroTemplate requires either demosPackage or demosPath option");
  }

  return (tree: any) => {
    visit(tree, "element", (node: any) => {
      if (node.tagName !== "code" || !node.properties.template) return;
      const templateName = node.properties.template;
      if (!templateName) return;
      const templatePath = path.join(demosRoot, "src", `${templateName}Demo.tsx`);
      try {
        const source = fs.readFileSync(templatePath, "utf8");
        node.children[0].value = source;
      } catch (err: any) {
        console.warn(`Error setting template`, err.message);
      }
    });
  };
};
