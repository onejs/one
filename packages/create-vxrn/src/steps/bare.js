import ansis from 'ansis';
import fs from 'fs-extra';
import { basename, dirname, join } from 'node:path';
function shouldIgnoreFile(filePath) {
    return filePath.match(/node_modules|yarn.lock|package-lock.json/g);
}
function shouldRenameFile(filePath, nameToReplace) {
    return basename(filePath).includes(nameToReplace);
}
async function renameFile(filePath, oldName, newName) {
    const newFileName = join(dirname(filePath), basename(filePath).replace(new RegExp(oldName, 'g'), newName));
    await fs.rename(filePath, newFileName);
}
function walk(current) {
    if (!fs.lstatSync(current).isDirectory()) {
        return [current];
    }
    const files = fs.readdirSync(current).map((child) => walk(join(current, child)));
    const result = [];
    return result.concat.apply([current], files);
}
export async function replaceNameInUTF8File(filePath, projectName, templateName) {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const replacedFileContent = fileContent
        .replace(new RegExp(templateName, 'g'), projectName)
        .replace(new RegExp(templateName.toLowerCase(), 'g'), projectName.toLowerCase());
    if (fileContent !== replacedFileContent) {
        await fs.writeFile(filePath, replacedFileContent, 'utf8');
    }
}
const main = async ({ isFullClone, projectName }) => {
    const placeholderName = 'bare';
    for (const filePath of walk(process.cwd()).reverse()) {
        if (shouldIgnoreFile(filePath)) {
            continue;
        }
        if (!(await fs.stat(filePath)).isDirectory()) {
            await replaceNameInUTF8File(filePath, projectName, 'bare');
        }
        if (shouldRenameFile(filePath, placeholderName)) {
            await renameFile(filePath, placeholderName, projectName);
        }
        else if (shouldRenameFile(filePath, placeholderName.toLowerCase())) {
            await renameFile(filePath, placeholderName.toLowerCase(), projectName.toLowerCase());
        }
    }
    // Inside vxrn's monorepo some paths are changed to root's node-modules, when generating a new project these should be changed.
    await replaceNameInUTF8File('android/app/build.gradle', '../../node_modules/', '../../../../node_modules/');
    await replaceNameInUTF8File('android/settings.gradle', '../node_modules/', '../../../node_modules/');
    await replaceNameInUTF8File(`ios/${projectName}.xcodeproj/project.pbxproj`, '../node_modules/react-native/scripts/', '../../../node_modules/react-native/scripts/');
    if (isFullClone) {
        console.info(`
${ansis.green.bold('Done!')} Created a new project under ./${ansis.greenBright(projectName)} visit your project:
  • ${ansis.green('cd')} ${projectName}

${ansis.green(`Run instructions for ${ansis.bold('Android')}:`)}
  • Have an Android emulator running (quickest way to get started), or a device connected.
  • npx react-native run-android

${ansis.blue(`Run instructions for ${ansis.bold('iOS')}:`)}
  • Install Cocoapods
    • bundle install # you need to run this only once in your project.
    • bundle exec pod install
    • cd ..

  • npx react-native run-ios
  ${ansis.gray('- or -')}
  • Open ${projectName}/ios/${projectName}.xcworkspace in Xcode or run "xed -b ios"
  • Hit the Run button

`);
    }
};
export default main;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFyZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJhcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQ3pCLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUN6QixPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFHbkQsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFnQjtJQUN4QyxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQTtBQUNwRSxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFnQixFQUFFLGFBQXFCO0lBQy9ELE9BQU8sUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUNuRCxDQUFDO0FBRUQsS0FBSyxVQUFVLFVBQVUsQ0FBQyxRQUFnQixFQUFFLE9BQWUsRUFBRSxPQUFlO0lBQzFFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FDdEIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUNqQixRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FDOUQsQ0FBQTtJQUVELE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUE7QUFDeEMsQ0FBQztBQUVELFNBQVMsSUFBSSxDQUFDLE9BQWU7SUFDM0IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztRQUN6QyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDbEIsQ0FBQztJQUVELE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFF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