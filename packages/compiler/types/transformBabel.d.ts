import babel from "@babel/core";
import type { GetTransformProps, GetTransformResponse } from "./types";
type Props = GetTransformProps & {
  userSetting?: GetTransformResponse;
};
export declare function getBabelOptions(props: Props): babel.TransformOptions | null;
/**
 * Transform input to mostly ES5 compatible code, keep ESM syntax, and transform generators.
 */
export declare function transformBabel(
  id: string,
  code: string,
  options: babel.TransformOptions,
): Promise<babel.BabelFileResult | undefined>;
export {};
//# sourceMappingURL=transformBabel.d.ts.map
