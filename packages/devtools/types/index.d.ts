type ClientMessages = {
    type: 'add-devtool';
    id: string;
    name: string;
};
type ServerMessages = {
    type: '';
};
export declare function startServer(): {
    onMessage(cb: (message: ClientMessages) => void): void;
    sendMessage(message: ServerMessages): void;
};
export declare function startClient(): {
    onMessage(cb: (message: ServerMessages) => void): Promise<void>;
    sendMessage(message: ClientMessages): Promise<void>;
};
export {};
//# sourceMappingURL=index.d.ts.map