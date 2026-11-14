import { getPathFromState } from '../fork/getPathFromState.js';
import { getStateFromPath } from '../fork/getStateFromPath.js';
export declare function getInitialURL(): Promise<string | null> | string;
export declare function getRootURL(): string;
export declare function getDefaultLinkingPrefixes(): string[];
export declare function addEventListener(listener: (url: string) => void): () => void;
export { getStateFromPath, getPathFromState };
//# sourceMappingURL=linking.native.d.ts.map