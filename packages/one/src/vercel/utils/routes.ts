import fs from "fs";
import path from "path";
import resolveFrom from "resolve-from";

export function findUpProjectRoot(cwd: string = __filename): string | null {
  if ([".", path.sep].includes(cwd)) return null;

  const found = resolveFrom.silent(cwd, "./package.json");

  if (found) {
    return path.dirname(found);
  }
  return findUpProjectRoot(path.dirname(cwd));
}

const PAGES_DIR = `${findUpProjectRoot()}/pages`;

export function getRoutes(dirPath = PAGES_DIR): string[] {
  return fs
    .readdirSync(dirPath)
    .map((file) => {
      const filepath = path.join(dirPath, file);

      if (fs.statSync(filepath).isDirectory()) {
        return getRoutes(filepath);
      } else {
        return filepath;
      }
    })
    .filter(Boolean)
    .flat(2);
}
