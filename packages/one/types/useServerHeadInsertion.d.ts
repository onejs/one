export type ServerHeadInsertionCallback = () => React.ReactElement;
export declare const getServerHeadInsertions: (id: string) => ServerHeadInsertionCallback[] | undefined;
export declare const ServerRenderID: import("react").Context<string>;
export declare const useServerHeadInsertion: (callback: ServerHeadInsertionCallback) => void;
//# sourceMappingURL=useServerHeadInsertion.d.ts.map