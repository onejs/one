export declare const templates: readonly [{
    readonly extraSteps: import("./steps/types").ExtraSteps;
    readonly preInstall: import("./steps/types").ExtraSteps;
    readonly title: "Basic";
    readonly value: "Basic";
    readonly description: "The simplest starting point, vanilla React Native";
    readonly type: "included-in-monorepo";
    readonly hidden: false;
    readonly repo: {
        readonly url: "https://github.com/onejs/one.git";
        readonly sshFallback: "git@github.com:onejs/one.git";
        readonly dir: readonly ["examples", "one-basic"];
        readonly branch: "main";
    };
}, {
    readonly extraSteps: import("./steps/types").ExtraSteps;
    readonly preInstall: import("./steps/types").ExtraSteps;
    readonly title: "Takeout";
    readonly value: "Takeout";
    readonly description: "One, Tamagui, Zero, Better Auth";
    readonly type: "external-repo";
    readonly hidden: false;
    readonly repo: {
        readonly url: "https://github.com/tamagui/takeout2.git";
        readonly sshFallback: "git@github.com:tamagui/takeout2.git";
        readonly dir: readonly [];
        readonly branch: "main";
    };
}];
export type Template = (typeof templates)[number];
export type CloneableTemplate = Extract<Template, {
    repo: any;
}>;
//# sourceMappingURL=templates.d.ts.map