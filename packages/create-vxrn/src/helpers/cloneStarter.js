import { copy, ensureDir, pathExists } from 'fs-extra';
import { homedir } from 'node:os';
import { join, sep } from 'node:path';
import { rimraf } from 'rimraf';
import { exec, execPromiseQuiet } from './exec';
const home = homedir();
const vxrnDir = join(home, '.vxrn');
export const cloneStarter = async (template, resolvedProjectPath) => {
    const dir = await setupVxrnDotDir(template, join(vxrnDir, 'vxrn', template.repo.url.split('/').at(-1)));
    if (!(await pathExists(dir))) {
        console.error(`Missing template for ${template.value} in ${dir}`);
        process.exit(1);
    }
    await copy(dir, resolvedProjectPath);
    // reset git
    await rimraf(join(resolvedProjectPath, '.git'));
    if (!isInGitRepo()) {
        await execPromiseQuiet(`git init`, {
            cwd: resolvedProjectPath,
        });
    }
};
async function setupVxrnDotDir(template, targetGitDir, isRetry = false) {
    const branch = template.repo.branch;
    await ensureDir(vxrnDir);
    const isInSubDir = template.repo.dir.length > 0;
    if (!(await pathExists(targetGitDir))) {
        const sourceGitRepo = template.repo.url;
        const sourceGitRepoSshFallback = template.repo.sshFallback;
        const cmd = `git clone --branch ${branch} ${isInSubDir ? '--depth 1 --sparse --filter=blob:none ' : ''}${sourceGitRepo} "${targetGitDir}"`;
        try {
            await execPromiseQuiet(cmd);
        }
        catch (error) {
            if (cmd.includes('https://')) {
                console.info(`https failed - trying with ssh now...`);
                const sshCmd = cmd.replace(sourceGitRepo, sourceGitRepoSshFallback);
                await execPromiseQuiet(sshCmd);
            }
            else {
                throw error;
            }
        }
    }
    else {
        if (!(await pathExists(join(targetGitDir, '.git')))) {
            console.error(`Corrupt vxrn directory, please delete ${targetGitDir} folder and re-run`);
            process.exit(1);
        }
    }
    if (isInSubDir) {
        const cmd = `git sparse-checkout set ${template.repo.dir.join(sep) ?? '.'}`;
        await execPromiseQuiet(cmd, { cwd: targetGitDir });
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
    }
    catch (err) {
        if (isRetry) {
            console.info(`Error updating: ${err.message} ${isRetry ? `failing.\n${err.stack}` : 'trying from fresh.'}`);
            console.info(`Please file an issue: https://github.com/onejs/one/issues/new?assignees=&labels=&template=bug_report.md&title=`);
            process.exit(1);
        }
        await rimraf(targetGitDir);
        return await setupVxrnDotDir(template, targetGitDir, true);
    }
}
function isInGitRepo() {
    try {
        exec('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
        return true;
    }
    catch (error) {
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xvbmVTdGFydGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xvbmVTdGFydGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFRLFVBQVUsRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sU0FBUyxDQUFBO0FBQ2pDLE9BQU8sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBQ3JDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFFL0IsT0FBTyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUUvQyxNQUFNLElBQUksR0FBRyxPQUFPLEVBQUUsQ0FBQTtBQUN0QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0FBRW5DLE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxLQUFLLEVBQy9CLFFBQW9DLEVBQ3BDLG1CQUEyQixFQUMzQixFQUFFO0lBQ0YsTUFBTSxHQUFHLEdBQUcsTUFBTSxlQUFlLENBQy9CLFFBQVEsRUFDUixJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FDNUQsQ0FBQTtJQUVELElBQUksQ0FBQyxDQUFDLE1BQU0sVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUM3QixPQUFPLENBQUMsS0FBSyxDQUFDLHdCQUF3QixRQUFRLENBQUMsS0FBSyxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUE7UUFDakUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsTUFBTSxJQUFJLENBQUMsR0FBRyxFQUFFLG1CQUFtQixDQUFDLENBQUE7SUFFcEMsWUFBWTtJQUNaLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBRS9DLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO1FBQ25CLE1BQU0sZ0JBQWdCLENBQUMsVUFBVSxFQUFFO1lBQ2pDLEdBQUcsRUFBRSxtQkFBbUI7U0FDekIsQ0FBQyxDQUFBO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQTtBQUVELEtBQUssVUFBVSxlQUFlLENBQzVCLFFBQW9DLEVBQ3BDLFlBQW9CLEVBQ3BCLE9BQU8sR0FBRyxLQUFLO0lBRWYsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUE7SUFFbkMsTUFBTSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUE7SUFFeEIsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUUvQyxJQUFJLENBQUMsQ0FBQyxNQUFNLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDdEMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUE7UUFDdkMsTUFBTSx3QkFBd0IsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUUxRCxNQUFNLEdBQUcsR0FBRyxzQkFBc0IsTUFBTSxJQUN0QyxVQUFVLENBQUMsQ0FBQyxDQUFDLHdDQUF3QyxDQUFDLENBQUMsQ0FBQyxFQUMxRCxHQUFHLGFBQWEsS0FBSyxZQUFZLEdBQUcsQ0FBQTtRQUVwQyxJQUFJLENBQUM7WUFDSCxNQUFNLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzdCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQzdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsdUNBQXVDLENBQUMsQ0FBQTtnQkFDckQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsd0JBQXdCLENBQUMsQ0FBQTtnQkFDbkUsTUFBTSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNoQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ04sTUFBTSxLQUFLLENBQUE7WUFDYixDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7U0FBTSxDQUFDO1FBQ04sSUFBSSxDQUFDLENBQUMsTUFBTSxVQUFVLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNwRCxPQUFPLENBQUMsS0FBSyxDQUFDLHlDQUF5QyxZQUFZLG9CQUFvQixDQUFDLENBQUE7WUFDeEYsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqQixDQUFDO0lBQ0gsQ0FBQztJQUVELElBQUksVUFBVSxFQUFFLENBQUM7UUFDZixNQUFNLEdBQUcsR0FBRywyQkFBMkIsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBQzNFLE1BQU0sZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUE7SUFDcEQsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILE1BQU0sSUFBSSxHQUFHLGtFQUFrRSxNQUFNLEVBQUUsQ0FBQTtRQUN2RixNQUFNLGdCQUFnQixDQUFDLElBQUksRUFBRTtZQUMzQixHQUFHLEVBQUUsWUFBWTtTQUNsQixDQUFDLENBQUE7UUFDRixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFZCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsQ0FBQyxNQUFNLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNoQyxDQUFDO1FBRUQsT0FBTyxHQUFHLENBQUE7SUFDWixDQUFDO0lBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztRQUNsQixJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ1osT0FBTyxDQUFDLElBQUksQ0FDVixtQkFBbUIsR0FBRyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLGFBQWEsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxDQUM5RixDQUFBO1lBQ0QsT0FBTyxDQUFDLElBQUksQ0FDVixnSEFBZ0gsQ0FDakgsQ0FBQTtZQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakIsQ0FBQztRQUNELE1BQU0sTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzFCLE9BQU8sTUFBTSxlQUFlLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0FBQ0gsQ0FBQztBQUVELFNBQVMsV0FBVztJQUNsQixJQUFJLENBQUM7UUFDSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUNoRSxPQUFPLElBQUksQ0FBQTtJQUNiLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxLQUFLLENBQUE7SUFDZCxDQUFDO0FBQ0gsQ0FBQyJ9