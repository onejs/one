import { homedir } from "node:os";

export function labelProcess(title: string) {
  const home = homedir();
  const cwd = process.cwd();
  process.title = `Onejs:${title} > ${cwd.replace(home, "~")}`;
}
