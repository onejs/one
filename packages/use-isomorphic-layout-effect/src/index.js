import { useEffect, useLayoutEffect } from 'react';
// on native + client its a layout, if ssr its regular effect
export const useIsomorphicLayoutEffect = process.env.TAMAGUI_TARGET === 'native' || typeof window !== 'undefined'
    ? useLayoutEffect
    : useEffect;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxNQUFNLE9BQU8sQ0FBQTtBQUVsRCw2REFBNkQ7QUFDN0QsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQ3BDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxLQUFLLFFBQVEsSUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXO0lBQ3RFLENBQUMsQ0FBQyxlQUFlO0lBQ2pCLENBQUMsQ0FBQyxTQUFTLENBQUEifQ==