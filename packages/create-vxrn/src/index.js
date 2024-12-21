#!/usr/bin/env node
// inspired by https://github.com/vercel/next.js/blob/0355e5f63f87db489f36db8d814958cb4c2b828b/packages/create-next-app/helpers/examples.ts#L71
import ansis from 'ansis';
import { defineCommand, runMain } from 'citty';
import path from 'node:path';
import { cwd } from 'node:process';
import { getTemplateInfo } from './helpers/getTemplateInfo';
import { create } from './create';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
let projectPath = '';
function exit() {
    process.exit(0);
}
process.on('SIGTERM', exit);
process.on('SIGINT', exit);
const main = defineCommand({
    meta: {
        name: 'main',
        version: '0.0.0',
        description: 'Welcome to vxrn',
    },
    args: {
        directory: {
            type: 'positional',
            description: 'Directory to copy into',
            default: '',
        },
        template: {
            type: 'string',
            required: false,
            description: 'One of "bare", "tamagui", "router".',
        },
        info: {
            type: 'boolean',
            description: 'Output the post-install instructions for the template.',
        },
    },
    async run({ args }) {
        if (args.info) {
            let template = await getTemplateInfo(args.template);
            if ('extraSteps' in template) {
                await template.extraSteps({
                    isFullClone: false,
                    projectName: path.basename(cwd()),
                    projectPath: cwd(),
                });
            }
            return;
        }
        console.info(); // this newline prevents the ascii art from breaking
        console.info(ansis.bold('Creating vxrn app...'));
        await create({ template: args.template });
    },
});
runMain(main);
function getPackageVersion() {
    let dirname;
    if (typeof __dirname !== 'undefined') {
        // CommonJS
        dirname = __dirname;
    }
    else {
        // ESM
        dirname = path.dirname(fileURLToPath(import.meta.url));
    }
    const packagePath = path.join(dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return packageJson.version;
}
if (process.argv.includes('--version')) {
    console.info(getPackageVersion());
    process.exit(0);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsK0lBQStJO0FBRS9JLE9BQU8sS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUN6QixPQUFPLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxNQUFNLE9BQU8sQ0FBQTtBQUM5QyxPQUFPLElBQUksTUFBTSxXQUFXLENBQUE7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDM0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sVUFBVSxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxTQUFTLENBQUE7QUFFdEMsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFBO0FBRXBCLFNBQVMsSUFBSTtJQUNYLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDakIsQ0FBQztBQUVELE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO0FBQzNCLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO0FBRTFCLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQztJQUN6QixJQUFJLEVBQUU7UUFDSixJQUFJLEVBQUUsTUFBTTtRQUNaLE9BQU8sRUFBRSxPQUFPO1FBQ2hCLFdBQVcsRUFBRSxpQkFBaUI7S0FDL0I7SUFDRCxJQUFJLEVBQUU7UUFDSixTQUFTLEVBQUU7WUFDVCxJQUFJLEVBQUUsWUFBWTtZQUNsQixXQUFXLEVBQUUsd0JBQXdCO1lBQ3JDLE9BQU8sRUFBRSxFQUFFO1NBQ1o7UUFDRCxRQUFRLEVBQUU7WUFDUixJQUFJLEVBQUUsUUFBUTtZQUNkLFFBQVEsRUFBRSxLQUFLO1lBQ2YsV0FBVyxFQUFFLHFDQUFxQztTQUNuRDtRQUNELElBQUksRUFBRTtZQUNKLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLHdEQUF3RDtTQUN0RTtLQUNGO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRTtRQUNoQixJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNkLElBQUksUUFBUSxHQUFHLE1BQU0sZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNuRCxJQUFJLFlBQVksSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxRQUFRLENBQUMsVUFBVSxDQUFDO29CQUN4QixXQUFXLEVBQUUsS0FBSztvQkFDbEIsV0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUM7b0JBQ2pDLFdBQVcsRUFBRSxHQUFHLEVBQUU7aUJBQ25CLENBQUMsQ0FBQTtZQUNKLENBQUM7WUFDRCxPQUFNO1FBQ1IsQ0FBQztRQUVELE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQSxDQUFDLG9EQUFvRDtRQUNuRSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFBO1FBRWhELE1BQU0sTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQzNDLENBQUM7Q0FDRixDQUFDLENBQUE7QUFFRixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7QUFFYixTQUFTLGlCQUFpQjtJQUN4QixJQUFJLE9BQU8sQ0FBQTtJQUNYLElBQUksT0FBTyxTQUFTLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDckMsV0FBVztRQUNYLE9BQU8sR0FBRyxTQUFTLENBQUE7SUFDckIsQ0FBQztTQUFNLENBQUM7UUFDTixNQUFNO1FBQ04sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUN4RCxDQUFDO0lBQ0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUNsRSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtJQUNsRSxPQUFPLFdBQVcsQ0FBQyxPQUFPLENBQUE7QUFDNUIsQ0FBQztBQUVELElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztJQUN2QyxPQUFPLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtJQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ2pCLENBQUMifQ==