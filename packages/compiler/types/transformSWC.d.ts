import { type Output, type Options as SWCOptions } from "@swc/core";
import type { Options } from "./types";
export declare function transformSWC(
  id: string,
  code: string,
  options: Options & {
    es5?: boolean;
  },
  swcOptions?: SWCOptions,
): Promise<
  | Output
  | {
      code: string;
      map: any;
    }
  | undefined
>;
export declare const transformSWCStripJSX: (
  id: string,
  code: string,
) => Promise<Output | undefined>;
//# sourceMappingURL=transformSWC.d.ts.map
