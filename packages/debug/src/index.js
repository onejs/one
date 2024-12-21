import debug from 'debug';
const DEBUG = process.env.DEBUG;
/**
 * This is like `createDebugger()` in the Vite source code ([see](https://github.com/vitejs/vite/blob/v6.0.0-beta.2/packages/vite/src/node/utils.ts#L163)),
 * but some of its features are not supported yet to keeps things simple.
 */
export function createDebugger(namespacePartial, options = {}) {
    return {
        debug: createSingleDebugger(namespacePartial, options),
        debugDetails: createSingleDebugger(namespacePartial, options),
    };
}
function createSingleDebugger(namespacePartial, options = {}) {
    const namespace = `vxrn:${namespacePartial}`;
    const log = debug(namespace);
    const { onlyWhenFocused } = options;
    let enabled = log.enabled;
    if (enabled && onlyWhenFocused) {
        const ns = typeof onlyWhenFocused === 'string' ? onlyWhenFocused : namespace;
        enabled = !!DEBUG?.includes(ns);
    }
    // Not supported for now
    const filter = undefined;
    if (enabled) {
        const fn = (...args) => {
            if (!filter || args.some((a) => a?.includes?.(filter))) {
                log(...args);
            }
        };
        fn.namespace = namespace;
        return fn;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50c3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBUXpCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFBO0FBRS9COzs7R0FHRztBQUNILE1BQU0sVUFBVSxjQUFjLENBQzVCLGdCQUF3QixFQUN4QixVQUEyQixFQUFFO0lBRTdCLE9BQU87UUFDTCxLQUFLLEVBQUUsb0JBQW9CLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDO1FBQ3RELFlBQVksRUFBRSxvQkFBb0IsQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUM7S0FDOUQsQ0FBQTtBQUNILENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUMzQixnQkFBd0IsRUFDeEIsVUFBMkIsRUFBRTtJQUU3QixNQUFNLFNBQVMsR0FBRyxRQUFRLGdCQUFnQixFQUFFLENBQUE7SUFFNUMsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzVCLE1BQU0sRUFBRSxlQUFlLEVBQUUsR0FBRyxPQUFPLENBQUE7SUFFbkMsSUFBSSxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQTtJQUN6QixJQUFJLE9BQU8sSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMvQixNQUFNLEVBQUUsR0FBRyxPQUFPLGVBQWUsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1FBQzVFLE9BQU8sR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsd0JBQXdCO0lBQ3hCLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQTtJQUV4QixJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ1osTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQXdCLEVBQUUsRUFBRTtZQUN6QyxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZELEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFBO1lBQ2QsQ0FBQztRQUNILENBQUMsQ0FBQTtRQUVELEVBQUUsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO1FBRXhCLE9BQU8sRUFBRSxDQUFBO0lBQ1gsQ0FBQztBQUNILENBQUMifQ==