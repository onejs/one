import ansis from 'ansis';
import FSExtra from 'fs-extra';
import { join } from 'node:path';
import { execPromise } from '../helpers/exec';
export const extraSteps = async ({ isFullClone, projectName, packageManager }) => {
    const useBun = packageManager === 'bun';
    const runCommand = (scriptName) => `${packageManager} ${useBun ? '' : 'run '}${scriptName}`;
    if (isFullClone) {
        console.info(`\n${ansis.green.bold('Done!')} Created a new project under ./${ansis.greenBright(projectName)}`);
    }
    console.info(`\nTo run: 

  ${ansis.green('cd')} ${projectName}
  ${ansis.green(runCommand('dev'))}\n`);
};
export const preInstall = async ({ projectName, packageManager, projectPath }) => {
    const envExample = join(projectPath, '.env.example');
    if (FSExtra.existsSync(envExample)) {
        await FSExtra.move(envExample, join(projectPath, '.env'));
        console.info(`Moved .env.example to .env`);
    }
    if (packageManager === 'pnpm') {
        await FSExtra.writeFile(join(projectPath, `.npmrc`), `node-linker=hoisted\n`);
        console.info(`Set configuration to avoid symlinked node modules`);
    }
    if (packageManager === 'yarn') {
        await FSExtra.writeFile(join(projectPath, '.yarnrc.yml'), `
compressionLevel: mixed
enableGlobalCache: false
enableTelemetry: false
nodeLinker: node-modules

logFilters:
  - code: YN0002
    level: discard
  - code: YN0060
    level: discard
  - code: YN0006
    level: discard
  - code: YN0076
    level: discard
`);
        await execPromise(`yarn set version stable`);
        await FSExtra.writeFile(join(projectPath, 'yarn.lock'), '');
        console.info(`Set up yarn for latest version`);
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsib25lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUN6QixPQUFPLE9BQU8sTUFBTSxVQUFVLENBQUE7QUFDOUIsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUNoQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFHN0MsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFlLEtBQUssRUFBRSxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBRTtJQUMzRixNQUFNLE1BQU0sR0FBRyxjQUFjLEtBQUssS0FBSyxDQUFBO0lBRXZDLE1BQU0sVUFBVSxHQUFHLENBQUMsVUFBa0IsRUFBRSxFQUFFLENBQ3hDLEdBQUcsY0FBYyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsVUFBVSxFQUFFLENBQUE7SUFFMUQsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNoQixPQUFPLENBQUMsSUFBSSxDQUNWLEtBQUssS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGtDQUFrQyxLQUFLLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQ2pHLENBQUE7SUFDSCxDQUFDO0lBRUQsT0FBTyxDQUFDLElBQUksQ0FBQzs7SUFFWCxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVc7SUFDaEMsS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDdkMsQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFlLEtBQUssRUFBRSxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRTtJQUMzRixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBRXBELElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1FBQ25DLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ3pELE9BQU8sQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsSUFBSSxjQUFjLEtBQUssTUFBTSxFQUFFLENBQUM7UUFDOUIsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUM3RSxPQUFPLENBQUMsSUFBSSxDQUFDLG1EQUFtRCxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVELElBQUksY0FBYyxLQUFLLE1BQU0sRUFBRSxDQUFDO1FBQzlCLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FDckIsSUFBSSxDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUMsRUFDaEM7Ozs7Ozs7Ozs7Ozs7OztDQWVMLENBQ0ksQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLHlCQUF5QixDQUFDLENBQUE7UUFDNUMsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDM0QsT0FBTyxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFBO0lBQ2hELENBQUM7QUFDSCxDQUFDLENBQUEifQ==