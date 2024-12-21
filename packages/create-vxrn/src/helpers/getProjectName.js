import path from 'node:path';
import ansis from 'ansis';
import prompts from 'prompts';
import { validateNpmName } from './validateNpmPackage';
export const getProjectName = async (projectPath) => {
    if (typeof projectPath === 'string') {
        projectPath = projectPath.trim();
    }
    console.info();
    console.info(ansis.yellow(`  Hello. Let's create a new ${ansis.yellowBright(`①`)}  app...`));
    console.info();
    if (!projectPath) {
        const defaultName = 'hello-world';
        const res = await prompts({
            type: 'text',
            name: 'path',
            message: 'Name',
            initial: defaultName,
            validate: (name) => {
                const validation = validateNpmName(path.basename(path.resolve(name)));
                if (validation.valid) {
                    return true;
                }
                return 'Invalid name: ' + validation.problems[0];
            },
        });
        if (typeof res.path === 'string') {
            projectPath = res.path.trim() || defaultName;
        }
    }
    if (!projectPath) {
        const name = `create-vxrn`;
        console.info();
        console.info('Please specify the project directory:');
        console.info(`  ${ansis.cyan(name)} ${ansis.green('<project-directory>')}`);
        console.info();
        console.info('For example:');
        console.info(`  ${ansis.cyan(name)} ${ansis.green('my-app')}`);
        console.info();
        console.info(`Run ${ansis.cyan(`${name} --help`)} to see all options.`);
        process.exit(1);
    }
    return projectPath;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0UHJvamVjdE5hbWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXRQcm9qZWN0TmFtZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLElBQUksTUFBTSxXQUFXLENBQUE7QUFDNUIsT0FBTyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQ3pCLE9BQU8sT0FBTyxNQUFNLFNBQVMsQ0FBQTtBQUM3QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFFdEQsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLEtBQUssRUFBRSxXQUFvQixFQUFFLEVBQUU7SUFDM0QsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNwQyxXQUFXLEdBQUcsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ2xDLENBQUM7SUFFRCxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsK0JBQStCLEtBQUssQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7SUFDNUYsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO0lBRWQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2pCLE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQTtRQUNqQyxNQUFNLEdBQUcsR0FBRyxNQUFNLE9BQU8sQ0FBQztZQUN4QixJQUFJLEVBQUUsTUFBTTtZQUNaLElBQUksRUFBRSxNQUFNO1lBQ1osT0FBTyxFQUFFLE1BQU07WUFDZixPQUFPLEVBQUUsV0FBVztZQUNwQixRQUFRLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRTtnQkFDekIsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3JFLElBQUksVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNyQixPQUFPLElBQUksQ0FBQTtnQkFDYixDQUFDO2dCQUNELE9BQU8sZ0JBQWdCLEdBQUcsVUFBVSxDQUFDLFFBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNuRCxDQUFDO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsSUFBSSxPQUFPLEdBQUcsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDakMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksV0FBVyxDQUFBO1FBQzlDLENBQUM7SUFDSCxDQUFDO0lBRUQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2pCLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQTtRQUMxQixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLENBQUE7UUFDckQsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUMzRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQzVCLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzlELE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNkLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxTQUFTLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUN2RSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxPQUFPLFdBQVcsQ0FBQTtBQUNwQixDQUFDLENBQUEifQ==