import type { Environment } from "./types";

type Conf = {
  enableNativewind?: boolean;
  enableReanimated?: boolean;
  enableCompiler?: boolean | Environment[];
  enableNativeCSS?: boolean;
};

export const configuration: Conf = {
  enableNativewind: false,
  enableReanimated: false,
  enableCompiler: false,
  enableNativeCSS: false,
};

export function configureVXRNCompilerPlugin(_: Conf) {
  Object.assign(configuration, _);
}
