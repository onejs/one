import { execSync as nodeExecSync } from "node:child_process";

export const execSync = (cmd: string, options?: Parameters<typeof nodeExecSync>[1]) => {
  return nodeExecSync(cmd, {
    stdio: "inherit",
    ...options,
  });
};
