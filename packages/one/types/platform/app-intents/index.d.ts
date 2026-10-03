export type AppIntentHandler = (text: string | null) => string | Promise<string>;
declare function defineAction(identifier: string, handler: AppIntentHandler): () => void;
export declare const AppIntents: Readonly<{
    defineAction: typeof defineAction;
}>;
export {};
//# sourceMappingURL=index.d.ts.map