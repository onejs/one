export type AppIntentHandler = (text: string | null) => string | Promise<string>;
declare function defineAction(identifier: string, handler: AppIntentHandler): () => void;
declare const nativeAppIntents: Readonly<{
    defineAction: typeof defineAction;
}>;
export declare const AppIntents: typeof nativeAppIntents;
export {};
//# sourceMappingURL=index.native.d.ts.map