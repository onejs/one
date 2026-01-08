export type ReactComponent = () => React.ReactElement<any, any> | null;
export type FileStub = (Record<string, unknown> & {
    default: ReactComponent;
    unstable_settings?: Record<string, any>;
}) | ReactComponent;
export type NativeIntentStub = any;
export type MemoryContext = Record<string, FileStub | NativeIntentStub> & {
    '+native-intent'?: NativeIntentStub;
};
export declare function inMemoryContext(context: MemoryContext): ((id: string) => any) & {
    resolve: (key: string) => string;
    id: string;
    keys: () => string[];
};
type MockContextConfig = string[];
export declare function getMockContext(context: MockContextConfig): ((id: string) => any) & {
    resolve: (key: string) => string;
    id: string;
    keys: () => string[];
};
export declare function getMockConfig(context: MockContextConfig, metaOnly?: boolean): {
    initialRouteName?: string;
    screens: Record<string, import("./getReactNavigationConfig").Screen>;
};
export {};
//# sourceMappingURL=testing-utils.d.ts.map