import { copy, ensureDir, move, pathExists } from "fs-extra";
import { homedir } from "node:os";
import { join, sep } from "node:path";
import { rimraf } from "rimraf";
import type { templates } from "../templates";
import { exec, execPromiseQuiet } from "@vxrn/utils";

const home = homedir();
const vxrnDir = join(home, ".vxrn");

export const cloneStarter = async (
  template: (typeof templates)[number],
  resolvedProjectPath: string,
) => {
  const dir = await setupVxrnDotDir(
    template,
    join(vxrnDir, "vxrn", template.repo.url.split("/").at(-1)!),
  );

  if (!(await pathExists(dir))) {
    console.error(`Missing template for ${template.value} in ${dir}`);
    process.exit(1);
  }

  await copy(dir, resolvedProjectPath);

  // reset git
  await rimraf(join(resolvedProjectPath, ".git"));

  if (!isInGitRepo()) {
    await execPromiseQuiet(`git init`, {
      cwd: resolvedProjectPath,
    });
  }
};

async function setupVxrnDotDir(
  template: (typeof templates)[number],
  targetGitDir: string,
  isRetry = false,
) {
  const branch = template.repo.branch;

  await ensureDir(vxrnDir);

  const isInSubDir = template.repo.dir.length > 0;

  if (!(await pathExists(targetGitDir))) {
    const sourceGitRepo = template.repo.url;
    const sourceGitRepoSshFallback = template.repo.sshFallback;

    const cmd = `git clone --branch ${branch} ${
      isInSubDir ? "--depth 1 --sparse --filter=blob:none " : ""
    }${sourceGitRepo} "${targetGitDir}"`;

    try {
      await execPromiseQuiet(cmd);
    } catch (error) {
      if (cmd.includes("https://")) {
        console.info(`https failed - trying with ssh now...`);
        const sshCmd = cmd.replace(sourceGitRepo, sourceGitRepoSshFallback);
        await execPromiseQuiet(sshCmd);
      } else {
        throw error;
      }
    }
  } else {
    if (!(await pathExists(join(targetGitDir, ".git")))) {
      console.error(`Corrupt vxrn directory, please delete ${targetGitDir} folder and re-run`);
      process.exit(1);
    }
  }

  if (isInSubDir) {
    try {
      const cmd = `git sparse-checkout set ${template.repo.dir.join(sep) ?? "."}`;
      await execPromiseQuiet(cmd, { cwd: targetGitDir });
    } catch (err) {
      if (`${err}`.includes(`code 128`)) {
        console.warn(`⚠️ Note: you need to be sure you can git clone from Github, your SSH key isn't valid.
      
  - See: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account

`);
      }
      throw err;
    }
  }

  try {
    const cmd2 = `git pull --rebase --allow-unrelated-histories --depth 1 origin ${branch}`;
    await execPromiseQuiet(cmd2, {
      cwd: targetGitDir,
    });
    console.info();

    const dir = join(targetGitDir, ...template.repo.dir);
    if (!(await pathExists(dir))) {
      throw new Error(`Re-clone...`);
    }

    return dir;
  } catch (err: any) {
    if (isRetry) {
      console.info(
        `Error updating: ${err.message} ${isRetry ? `failing.\n${err.stack}` : "trying from fresh."}`,
      );
      console.info(
        `Please file an issue: https://github.com/onejs/one/issues/new?assignees=&labels=&template=bug_report.md&title=`,
      );
      process.exit(1);
    }
    await rimraf(targetGitDir);
    return await setupVxrnDotDir(template, targetGitDir, true);
  }
}

function isInGitRepo() {
  try {
    exec("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
}
