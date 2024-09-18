import { buildBundle } from './buildBundle';
export declare const bundleCommand: {
    name: string;
    description: string;
    func: typeof buildBundle;
    options: ({
        name: string;
        description: string;
        default?: undefined;
        parse?: undefined;
    } | {
        name: string;
        description: string;
        default: string;
        parse?: undefined;
    } | {
        name: string;
        description: string;
        parse: (val: string) => boolean;
        default: boolean;
    } | {
        name: string;
        description: string;
        parse: (val: string) => boolean;
        default?: undefined;
    } | {
        name: string;
        description: string;
        parse: (workers: string) => number;
        default?: undefined;
    } | {
        name: string;
        description: string;
        default: boolean;
        parse?: undefined;
    } | {
        name: string;
        description: string;
        parse: (val: string) => string;
        default?: undefined;
    } | {
        name: string;
        description: string;
        parse: (val: string, previous?: Array<string>) => Array<string>;
        default?: undefined;
    })[];
};
//# sourceMappingURL=index.d.ts.map