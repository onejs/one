export declare const templates: readonly [{
    readonly extraSteps: import("./steps/types").ExtraSteps;
    readonly preInstall: import("./steps/types").ExtraSteps;
    readonly title: "One + Zero";
    readonly value: "one-zero";
    readonly type: "included-in-monorepo";
    readonly hidden: false;
    readonly repo: {
        readonly url: "https://github.com/onejs/one.git";
        readonly sshFallback: "git@github.com:onejs/one.git";
        readonly dir: readonly ["examples", "one-zero"];
        readonly branch: "main";
    };
}, {
    readonly extraSteps: import("./steps/types").ExtraSteps;
    readonly preInstall: import("./steps/types").ExtraSteps;
    readonly title: "Minimal";
    readonly value: "Minimal";
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
    readonly title: "Minimal Tamagui";
    readonly value: "Tamagui";
    readonly type: "included-in-monorepo";
    readonly hidden: false;
    readonly repo: {
        readonly url: "https://github.com/onejs/one.git";
        readonly sshFallback: "git@github.com:onejs/one.git";
        readonly dir: readonly ["examples", "one-tamagui"];
        readonly branch: "main";
    };
}, {
    readonly extraSteps: import("./steps/types").ExtraSteps;
    readonly preInstall: import("./steps/types").ExtraSteps;
    readonly title: "Fullstack Traditional - Drizzle, Postgres, Tamagui";
    readonly value: "Recommended";
    readonly type: "included-in-monorepo";
    readonly hidden: false;
    readonly repo: {
        readonly url: "https://github.com/onejs/one.git";
        readonly sshFallback: "git@github.com:onejs/one.git";
        readonly dir: readonly ["examples", "one-recommended"];
        readonly branch: "main";
    };
}];
