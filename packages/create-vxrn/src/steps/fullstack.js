import ansis from 'ansis';
const packageManager = 'yarn';
const useYarn = packageManager === 'yarn';
const runCommand = (scriptName) => `${packageManager} ${useYarn ? '' : 'run '}${scriptName}`;
const main = async ({ isFullClone, projectName }) => {
    if (isFullClone) {
        console.info(`
${ansis.green.bold('Done!')} Created a new project under ./${ansis.greenBright(projectName)} visit your project:
 • ${ansis.green('cd')} ${projectName}
`);
    }
    console.info(`
To start the dev server, run: ${ansis.green(runCommand('dev'))}
`);
};
export default main;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVsbHN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZnVsbHN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUl6QixNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUE7QUFDN0IsTUFBTSxPQUFPLEdBQUcsY0FBYyxLQUFLLE1BQU0sQ0FBQTtBQUV6QyxNQUFNLFVBQVUsR0FBRyxDQUFDLFVBQWtCLEVBQUUsRUFBRSxDQUFDLEdBQUcsY0FBYyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsVUFBVSxFQUFFLENBQUE7QUFFcEcsTUFBTSxJQUFJLEdBQWUsS0FBSyxFQUFFLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUU7SUFDOUQsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNoQixPQUFPLENBQUMsSUFBSSxDQUFDO0VBQ2YsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGtDQUFrQyxLQUFLLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQztLQUN0RixLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVc7Q0FDcEMsQ0FBQyxDQUFBO0lBQ0EsQ0FBQztJQUNELE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0NBQ2lCLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO0NBQzdELENBQUMsQ0FBQTtBQUNGLENBQUMsQ0FBQTtBQUVELGVBQWUsSUFBSSxDQUFBIn0=