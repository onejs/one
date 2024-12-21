// import * as FullstackSteps from './steps/fullstack'
import * as BasicTemplateSteps from './steps/one';
export const templates = [
    {
        title: `One + Zero`,
        value: 'one-zero',
        type: 'included-in-monorepo',
        hidden: false,
        repo: {
            url: `https://github.com/onejs/one.git`,
            sshFallback: `git@github.com:onejs/one.git`,
            dir: [`examples`, `one-zero`],
            branch: 'main',
        },
        ...BasicTemplateSteps,
    },
    {
        title: `Minimal`,
        value: 'Minimal',
        type: 'included-in-monorepo',
        hidden: false,
        repo: {
            url: `https://github.com/onejs/one.git`,
            sshFallback: `git@github.com:onejs/one.git`,
            dir: [`examples`, `one-basic`],
            branch: 'main',
        },
        ...BasicTemplateSteps,
    },
    {
        title: `Minimal Tamagui`,
        value: 'Tamagui',
        type: 'included-in-monorepo',
        hidden: false,
        repo: {
            url: `https://github.com/onejs/one.git`,
            sshFallback: `git@github.com:onejs/one.git`,
            dir: [`examples`, `one-tamagui`],
            branch: 'main',
        },
        ...BasicTemplateSteps,
    },
    {
        title: `Fullstack Traditional - Drizzle, Postgres, Tamagui`,
        value: 'Recommended',
        type: 'included-in-monorepo',
        hidden: false,
        repo: {
            url: `https://github.com/onejs/one.git`,
            sshFallback: `git@github.com:onejs/one.git`,
            dir: [`examples`, `one-recommended`],
            branch: 'main',
        },
        ...BasicTemplateSteps,
    },
    // {
    //   title: `Fullstack - Recommended + Supabase Auth flows`,
    //   value: 'Fullstack',
    //   type: 'included-in-monorepo',
    //   hidden: false,
    //   repo: {
    //     url: `https://github.com/onejs/one.git`,
    //     sshFallback: `git@github.com:onejs/one.git`,
    //     dir: [`examples`, `one-basic`],
    //     branch: 'main',
    //   },
    //   ...FullstackSteps,
    // },
    // {
    //   title: `Bare`,
    //   value: 'bare',
    //   type: 'included-in-monorepo',
    //   hidden: false,
    //   repo: {
    //     url: `https://github.com/onejs/one.git`,
    //     sshFallback: `git@github.com:onejs/one.git`,
    //     dir: [`examples`, `bare`],
    //     branch: 'main',
    //   },
    //   extraSteps: stepsBare,
    // },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVtcGxhdGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHNEQUFzRDtBQUN0RCxPQUFPLEtBQUssa0JBQWtCLE1BQU0sYUFBYSxDQUFBO0FBRWpELE1BQU0sQ0FBQyxNQUFNLFNBQVMsR0FBRztJQUN2QjtRQUNFLEtBQUssRUFBRSxZQUFZO1FBQ25CLEtBQUssRUFBRSxVQUFVO1FBQ2pCLElBQUksRUFBRSxzQkFBc0I7UUFDNUIsTUFBTSxFQUFFLEtBQUs7UUFDYixJQUFJLEVBQUU7WUFDSixHQUFHLEVBQUUsa0NBQWtDO1lBQ3ZDLFdBQVcsRUFBRSw4QkFBOEI7WUFDM0MsR0FBRyxFQUFFLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQztZQUM3QixNQUFNLEVBQUUsTUFBTTtTQUNmO1FBQ0QsR0FBRyxrQkFBa0I7S0FDdEI7SUFFRDtRQUNFLEtBQUssRUFBRSxTQUFTO1FBQ2hCLEtBQUssRUFBRSxTQUFTO1FBQ2hCLElBQUksRUFBRSxzQkFBc0I7UUFDNUIsTUFBTSxFQUFFLEtBQUs7UUFDYixJQUFJLEVBQUU7WUFDSixHQUFHLEVBQUUsa0NBQWtDO1lBQ3ZDLFdBQVcsRUFBRSw4QkFBOEI7WUFDM0MsR0FBRyxFQUFFLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQztZQUM5QixNQUFNLEVBQUUsTUFBTTtTQUNmO1FBQ0QsR0FBRyxrQkFBa0I7S0FDdEI7SUFFRDtRQUNFLEtBQUssRUFBRSxpQkFBaUI7UUFDeEIsS0FBSyxFQUFFLFNBQVM7UUFDaEIsSUFBSSxFQUFFLHNCQUFzQjtRQUM1QixNQUFNLEVBQUUsS0FBSztRQUNiLElBQUksRUFBRTtZQUNKLEdBQUcsRUFBRSxrQ0FBa0M7WUFDdkMsV0FBVyxFQUFFLDhCQUE4QjtZQUMzQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLEVBQUUsYUFBYSxDQUFDO1lBQ2hDLE1BQU0sRUFBRSxNQUFNO1NBQ2Y7UUFDRCxHQUFHLGtCQUFrQjtLQUN0QjtJQUVEO1FBQ0UsS0FBSyxFQUFFLG9EQUFvRDtRQUMzRCxLQUFLLEVBQUUsYUFBYTtRQUNwQixJQUFJLEVBQUUsc0JBQXNCO1FBQzVCLE1BQU0sRUFBRSxLQUFLO1FBQ2IsSUFBSSxFQUFFO1lBQ0osR0FBRyxFQUFFLGtDQUFrQztZQUN2QyxXQUFXLEVBQUUsOEJBQThCO1lBQzNDLEdBQUcsRUFBRSxDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQztZQUNwQyxNQUFNLEVBQUUsTUFBTTtTQUNmO1FBQ0QsR0FBRyxrQkFBa0I7S0FDdEI7SUFFRCxJQUFJO0lBQ0osNERBQTREO0lBQzVELHdCQUF3QjtJQUN4QixrQ0FBa0M7SUFDbEMsbUJBQW1CO0lBQ25CLFlBQVk7SUFDWiwrQ0FBK0M7SUFDL0MsbURBQW1EO0lBQ25ELHNDQUFzQztJQUN0QyxzQkFBc0I7SUFDdEIsT0FBTztJQUNQLHVCQUF1QjtJQUN2QixLQUFLO0lBRUwsSUFBSTtJQUNKLG1CQUFtQjtJQUNuQixtQkFBbUI7SUFDbkIsa0NBQWtDO0lBQ2xDLG1CQUFtQjtJQUNuQixZQUFZO0lBQ1osK0NBQStDO0lBQy9DLG1EQUFtRDtJQUNuRCxpQ0FBaUM7SUFDakMsc0JBQXNCO0lBQ3RCLE9BQU87SUFDUCwyQkFBMkI7SUFDM0IsS0FBSztDQUNHLENBQUEifQ==