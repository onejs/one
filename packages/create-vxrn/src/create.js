import ansis from 'ansis';
import FSExtra from 'fs-extra';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { cloneStarter } from './helpers/cloneStarter';
import { getProjectName } from './helpers/getProjectName';
import { getTemplateInfo } from './helpers/getTemplateInfo';
import { installDependencies } from './helpers/installDependencies';
import { validateNpmName } from './helpers/validateNpmPackage';
import prompts from 'prompts';
import { detectPackageManager, } from './helpers/detectPackageManager';
const { existsSync, readFileSync, writeFileSync } = FSExtra;
export async function create(args) {
    const gitVersionString = Number.parseFloat(execSync(`git --version`).toString().replace(`git version `, '').trim());
    if (gitVersionString < 2.27) {
        console.error(`\n\n ⚠️ vxrn can't install: Git version must be >= 2.27\n\n`);
        process.exit(1);
    }
    let projectName = args.name || '';
    let resolvedProjectPath = path.resolve(process.cwd(), projectName);
    async function promptForName() {
        projectName = await getProjectName();
        resolvedProjectPath = path.resolve(process.cwd(), projectName);
    }
    if (projectName) {
        if (fs.existsSync(resolvedProjectPath)) {
            console.error(`Error: folder already exists: ${resolvedProjectPath}`);
            process.exit(1);
        }
    }
    else {
        await promptForName();
        while (fs.existsSync(resolvedProjectPath)) {
            console.info();
            console.info(ansis.yellow('⚠️'), `The folder ${ansis.underline(ansis.blueBright(projectName))} already exists, lets try another name`);
            console.info();
            console.info();
            await promptForName();
        }
    }
    // space
    console.info();
    let template = await getTemplateInfo(args.template);
    const { valid, problems } = validateNpmName(projectName);
    if (!valid) {
        console.error(`Could not create a project called ${ansis.red(`"${projectName}"`)} because of npm naming restrictions:`);
        problems.forEach((p) => console.error(`    ${ansis.red.bold('*')} ${p}`));
        process.exit(1);
    }
    console.info();
    const Spinner = await import('yocto-spinner').then((x) => x.default);
    const spinner = Spinner({
        text: `Creating...`,
        spinner: {
            frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
            interval: 100,
        },
    }).start();
    await FSExtra.mkdir(resolvedProjectPath);
    try {
        await cloneStarter(template, resolvedProjectPath);
        process.chdir(resolvedProjectPath);
    }
    catch (e) {
        console.error(`[vxrn] Failed to copy example into ${resolvedProjectPath}\n\n`, e);
        process.exit(1);
    }
    spinner.stop();
    console.info();
    console.info();
    console.info(ansis.green(`${projectName} created!`));
    console.info();
    console.info();
    const packageJson = await (async () => {
        const errorMessages = [];
        try {
            const dirname = typeof __dirname !== 'undefined'
                ? __dirname
                : path.dirname(fileURLToPath(import.meta.url));
            // Test the paths to ensure they exist
            const possiblePaths = [
                path.join(dirname, '..', 'package.json'),
                path.join(dirname, '..', '..', 'package.json'),
                path.join(dirname, '..', '..', '..', 'package.json'),
            ];
            const readFile = promisify(fs.readFile);
            for (const p of possiblePaths) {
                try {
                    const data = JSON.parse((await readFile(p)));
                    return data;
                }
                catch (e) {
                    if (e instanceof Error)
                        errorMessages.push(e.message);
                }
            }
            throw new Error('package.json not found in any of the expected locations.');
        }
        catch (e) {
            console.error('Failed to load package.json:', errorMessages.join('\n'));
            throw e;
        }
    })();
    // change root package.json's name to project name
    updatePackageJsonName(projectName, resolvedProjectPath);
    // replace `"workspace:^"` with the actual version
    updatePackageJsonVersions(packageJson.version, resolvedProjectPath);
    // change root app.json's name to project name
    updateAppJsonName(projectName, resolvedProjectPath);
    const packageManager = await (async () => {
        if ('packageManager' in template) {
            return template.packageManager;
        }
        const found = await detectPackageManager();
        const allFound = Object.keys(found);
        if (allFound.length === 1) {
            return allFound[0];
        }
        const response = await prompts({
            name: 'packageManager',
            type: 'select',
            message: `Package Manager:`,
            choices: allFound
                .filter((x) => found[x])
                .map((name) => ({
                title: name,
                value: name,
            })),
        });
        return response.packageManager;
    })();
    console.info();
    if ('preInstall' in template) {
        await template.preInstall({
            packageManager,
            isFullClone: true,
            projectName,
            projectPath: resolvedProjectPath,
        });
    }
    try {
        console.info();
        console.info(ansis.green(`Installing with ${packageManager}...`));
        console.info();
        await installDependencies(resolvedProjectPath, packageManager);
    }
    catch (e) {
        console.error('[vxrn] error installing with ' + packageManager + '\n' + `${e}`);
        process.exit(1);
    }
    // copy .env.default to .env
    const envDefault = path.join(resolvedProjectPath, '.env.default');
    const env = path.join(resolvedProjectPath, '.env');
    if (existsSync(envDefault) && !existsSync(env)) {
        await FSExtra.move(envDefault, env);
    }
    if ('extraSteps' in template) {
        await template.extraSteps({
            packageManager,
            isFullClone: true,
            projectName,
            projectPath: resolvedProjectPath,
        });
    }
    console.info();
}
function updatePackageJsonName(projectName, dir) {
    const packageJsonPath = path.join(dir, 'package.json');
    if (existsSync(packageJsonPath)) {
        const content = readFileSync(packageJsonPath).toString();
        const contentWithUpdatedName = content.replace(/("name": ")(.*)(",)/, `$1${projectName}$3`);
        writeFileSync(packageJsonPath, contentWithUpdatedName);
    }
}
function updatePackageJsonVersions(version, dir) {
    const packageJsonPath = path.join(dir, 'package.json');
    if (existsSync(packageJsonPath)) {
        const content = readFileSync(packageJsonPath).toString();
        // https://yarnpkg.com/features/workspaces#cross-references
        const contentWithUpdatedVersions = content
            .replace(/"workspace:\^"/gm, `"^${version}"`)
            .replace(/"workspace:~"/gm, `"~${version}"`)
            .replace(/"workspace:\*"/gm, `"${version}"`);
        writeFileSync(packageJsonPath, contentWithUpdatedVersions);
    }
}
function updateAppJsonName(projectName, dir) {
    const appJsonPath = path.join(dir, 'app.json');
    if (existsSync(appJsonPath)) {
        const content = readFileSync(appJsonPath).toString();
        const projectSlug = projectName.toLowerCase().replace(/\s/g, '-');
        const contentWithUpdatedName = content
            .replace(/("name": ")(.*)(",)/, `$1${projectName}$3`)
            .replace(/("slug": ")(.*)(",)/, `$1${projectSlug}$3`);
        writeFileSync(appJsonPath, contentWithUpdatedName);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3JlYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUN6QixPQUFPLE9BQU8sTUFBTSxVQUFVLENBQUE7QUFDOUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUN4QixPQUFPLElBQUksTUFBTSxXQUFXLENBQUE7QUFDNUIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sVUFBVSxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM5RCxPQUFPLE9BQU8sTUFBTSxTQUFTLENBQUE7QUFDN0IsT0FBTyxFQUNMLG9CQUFvQixHQUVyQixNQUFNLGdDQUFnQyxDQUFBO0FBRXZDLE1BQU0sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxHQUFHLE9BQU8sQ0FBQTtBQUUzRCxNQUFNLENBQUMsS0FBSyxVQUFVLE1BQU0sQ0FBQyxJQUEwQztJQUNyRSxNQUFNLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQ3hDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUN4RSxDQUFBO0lBQ0QsSUFBSSxnQkFBZ0IsR0FB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