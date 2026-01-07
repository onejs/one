import { writeFile } from "node:fs/promises";
import "../polyfills-server";
import { existsAsync } from "../utils/existsAsync";

export function ensureTSConfig() {
  existsAsync("tsconfig.json").then((hasTsConfig) => {
    if (!hasTsConfig) {
      console.info(
        `[one] adding default tsconfig.json. to disable set one/vite { config: { tsConfigPaths: false } }`,
      );
      writeFile(
        "tsconfig.json",
        `{
"compilerOptions": {
  "baseUrl": ".",
  "paths": {
    "~/*": ["./*"]
  },
  "strict": true,
  "rootDir": ".",
  "module": "Preserve",
  // allows react-native style imports without path extensions, for compat with platform-specific files
  "moduleResolution": "Bundler",
  "preserveSymlinks": true,
  "skipLibCheck": true,
  "jsx": "react-jsx",
  "noImplicitAny": false,
  "types": [
    "node",
    "react",
    "vite/client"
  ],
  "lib": [
    "dom",
    "esnext"
  ]
},
"exclude": [
  "node_modules",
  ".expo",
  "**/test",
  "**/dist",
  "**/types",
  "**/__tests__"
],
}
`,
      );
    }
  });
}
