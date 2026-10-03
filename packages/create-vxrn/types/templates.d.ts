export declare const templates: readonly [{
    readonly extraSteps: import("./steps/types").ExtraSteps;
    readonly preInstall: import("./steps/types").ExtraSteps;
    readonly title: `Basic`;
    readonly value: 'Basic';
    readonly description: 'The simplest starting point, vanilla Rreact Native';
    readonly type: 'included-in-monorepo';
    readonly hidden: false;
    readonly repo: {
        readonly url: `https://github.com/onejs/one.git`;
        readonly sshFallback: `git@github.com:onejs/one.git`;
        readonly dir: readonly [`examples`, `one-basic`];
        readonly branch: 'v2-beta-starter';
    };
}, {
    readonly extraSteps: import("./steps/types").ExtraSteps;
    readonly preInstall: import("./steps/types").ExtraSteps;
    readonly title: `Takeout Free`;
    readonly value: 'Takeout';
    readonly description: 'One, Tamagui, Zero, Better Auth';
    readonly type: 'external-repo';
    readonly hidden: false;
    readonly repo: {
        readonly url: `https://github.com/tamagui/takeout-free.git`;
        readonly sshFallback: `git@github.com:tamagui/takeout-free.git`;
        readonly dir: readonly [];
        readonly branch: 'main';
    };
}, {
    readonly title: `Takeout Production`;
    readonly value: 'TakeoutPro';
    readonly description: "Takeout + a startup in a repo. Refined stack that's production ready. Home/Terms/Docs, CI/CD, IaC, Integration Tests, Onboarding, Notifications, OTA Updates, Screens, >50 Components, >25 Agent Docs, >30 Scripts. See https://takeout.tamagui.dev";
    readonly type: 'external-link';
    readonly hidden: false;
    readonly externalUrl: 'https://takeout.tamagui.dev';
}];
export type Template = (typeof templates)[number];
export type CloneableTemplate = Extract<Template, {
    repo: any;
}>;
//# sourceMappingURL=templates.d.ts.map