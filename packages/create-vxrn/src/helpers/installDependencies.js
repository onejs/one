import { execPromise } from './exec';
export async function installDependencies(projectRoot, packageManager) {
    const options = { cwd: projectRoot };
    let command;
    switch (packageManager) {
        case 'bun':
            command = 'bun install';
            break;
        case 'yarn':
            command = 'yarn install';
            break;
        case 'pnpm':
            command = 'pnpm install';
            break;
        default:
            command = 'npm install --force';
            break;
    }
    try {
        await execPromise(command, options);
        console.info(`${packageManager} install completed successfully.`);
    }
    catch (error) {
        console.error(`Failed to install dependencies using ${packageManager}:`, error);
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFsbERlcGVuZGVuY2llcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluc3RhbGxEZXBlbmRlbmNpZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUVwQyxNQUFNLENBQUMsS0FBSyxVQUFVLG1CQUFtQixDQUN2QyxXQUFtQixFQUNuQixjQUErQztJQUUvQyxNQUFNLE9BQU8sR0FBRyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsQ0FBQTtJQUNwQyxJQUFJLE9BQWUsQ0FBQTtJQUVuQixRQUFRLGNBQWMsRUFBRSxDQUFDO1FBQ3ZCLEtBQUssS0FBSztZQUNSLE9BQU8sR0FBRyxhQUFhLENBQUE7WUFDdkIsTUFBSztRQUNQLEtBQUssTUFBTTtZQUNULE9BQU8sR0FBRyxjQUFjLENBQUE7WUFDeEIsTUFBSztRQUNQLEtBQUssTUFBTTtZQUNULE9BQU8sR0FBRyxjQUFjLENBQUE7WUFDeEIsTUFBSztRQUNQO1lBQ0UsT0FBTyxHQUFHLHFCQUFxQixDQUFBO1lBQy9CLE1BQUs7SUFDVCxDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxXQUFXLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ25DLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxjQUFjLGtDQUFrQyxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxjQUFjLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvRSxNQUFNLEtBQUssQ0FBQTtJQUNiLENBQUM7QUFDSCxDQUFDIn0=