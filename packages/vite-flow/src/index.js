import { createFilter } from 'vite';
// import { transformCommonJs, swcTransform } from '@vxrn/vite-native-swc'
import { transformFlowBabel } from './transformFlowBabel';
export async function transformFlow(input, { development = false } = {}) {
    // const { default: removeFlowTypes } = await import('flow-remove-types')
    // const stripped = removeFlowTypes(input).toString() as string
    // this freezes, likely due to not transforming react-native somehow properly, but not sure exactly how
    // const final = (await transformCommonJs('file.jsx', stripped))?.code
    const final = await transformFlowBabel(input);
    return final;
}
export default function createFlowPlugin(opts) {
    if (!opts?.include || (Array.isArray(opts.include) && opts.include.length === 0)) {
        return;
    }
    const filter = createFilter(opts?.include, opts?.exclude);
    return {
        name: '@vxrn/vite-flow',
        enforce: 'pre',
        transform(code, id) {
            if (filter(id)) {
                return transformFlow(code);
            }
            return null;
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sTUFBTSxDQUFBO0FBQ25DLDBFQUEwRTtBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUV6RCxNQUFNLENBQUMsS0FBSyxVQUFVLGFBQWEsQ0FDakMsS0FBYSxFQUNiLEVBQUUsV0FBVyxHQUFHLEtBQUssS0FBZ0MsRUFBRTtJQUV2RCx5RUFBeUU7SUFDekUsK0RBQStEO0lBQy9ELHVHQUF1RztJQUN2RyxzRUFBc0U7SUFFdEUsTUFBTSxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUU3QyxPQUFPLEtBQUssQ0FBQTtBQUNkLENBQUM7QUFPRCxNQUFNLENBQUMsT0FBTyxVQUFVLGdCQUFnQixDQUFDLElBQWM7SUFDckQsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2pGLE9BQU07SUFDUixDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBRXpELE9BQU87UUFDTCxJQUFJLEVBQUUsaUJBQWlCO1FBQ3ZCLE9BQU8sRUFBRSxLQUFLO1FBQ2QsU0FBUyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ2hCLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQ2YsT0FBTyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDNUIsQ0FBQztZQUNELE9BQU8sSUFBSSxDQUFBO1FBQ2IsQ0FBQztLQUNGLENBQUE7QUFDSCxDQUFDIn0=