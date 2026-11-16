import { type Dispatch, type SetStateAction } from 'react';
/**
 * useState for where the user is: a value that belongs to the screen it is
 * read in and comes back when warm start reopens that screen. leaving the
 * screen drops it, so nothing outlives the place it describes.
 */
export declare function useWarmState<T>(key: string, initial: T | (() => T), validate?: (value: unknown) => value is T): [T, Dispatch<SetStateAction<T>>];
//# sourceMappingURL=useWarmState.d.ts.map