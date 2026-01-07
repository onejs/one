import type { VXRNOptionsFilled } from "../config/getOptionsFilled";
type ServerOptions = Pick<VXRNOptionsFilled, "build" | "root">;
export declare const getServerCJSSetting: (options: ServerOptions) => boolean;
export declare const getServerEntry: (options: ServerOptions) => string;
export {};
//# sourceMappingURL=getServerEntry.d.ts.map
