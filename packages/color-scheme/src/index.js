import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { setColorScheme, useColorScheme as useColorSchemeBase, useColorSchemeSetting, } from '@vxrn/universal-color-scheme';
import { useIsomorphicLayoutEffect } from '@vxrn/use-isomorphic-layout-effect';
import { createContext, useContext, useMemo } from 'react';
export { getColorScheme, onColorSchemeChange } from '@vxrn/universal-color-scheme';
const storageKey = 'vxrn-scheme';
const getSetting = () => (typeof localStorage !== 'undefined' && localStorage.getItem(storageKey)) ||
    'system';
const SchemeContext = createContext({
    setting: 'system',
    scheme: 'light',
});
export const useColorScheme = () => {
    const [state] = useColorSchemeBase();
    return [state, setSchemeSetting];
};
export function useSchemeSetting() {
    const values = useContext(SchemeContext);
    return [values, setSchemeSetting];
}
export function setSchemeSetting(next) {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(storageKey, next);
    }
    setColorScheme(next);
}
export function SchemeProvider({ children, 
// defaults to tamagui-compatible
getClassName = (name) => `t_${name}`, }) {
    const [colorSchemeSetting] = useColorSchemeSetting();
    const [colorScheme] = useColorScheme();
    if (process.env.TAMAGUI_TARGET !== 'native') {
        useIsomorphicLayoutEffect(() => {
            // on startup lets set from localstorage
            setColorScheme(getSetting());
            const toAdd = getClassName(colorScheme);
            const { classList } = document.documentElement;
            if (!classList.contains(toAdd)) {
                const toRemove = colorScheme === 'light' ? 'dark' : 'light';
                classList.remove(getClassName(toRemove));
                classList.add(toAdd);
            }
        }, [colorScheme]);
    }
    return (_jsxs(_Fragment, { children: [process.env.TAMAGUI_TARGET === 'native' ? null : (_jsx("script", { dangerouslySetInnerHTML: {
                    __html: `let d = document.documentElement.classList
          d.remove('${getClassName('light')}')
            d.remove('${getClassName('dark')}')
          let e = localStorage.getItem('${storageKey}')
          let t =
            'system' === e || !e
              ? window.matchMedia('(prefers-color-scheme: dark)').matches
              : e === 'dark'
          t ? d.add('${getClassName('dark')}') : d.add('${getClassName('light')}')
          `,
                } })), _jsx(SchemeContext.Provider, { value: useMemo(() => ({
                    scheme: colorScheme,
                    setting: colorSchemeSetting,
                }), [colorScheme, colorSchemeSetting]), children: children })] }));
}
export const MetaTheme = ({ color, darkColor, lightColor, }) => {
    const [colorScheme] = useColorScheme();
    return (_jsxs(_Fragment, { children: [_jsx("meta", { itemProp: "__deopt", 
                // because the script below runs before render it actually ruins our nice ssr logic here
                // instead we just avoid the warning its a single tag
                suppressHydrationWarning: true, id: "vxrn-theme-color", name: "theme-color", content: color ?? (colorScheme === 'dark' ? darkColor : lightColor) }), _jsx("script", { id: "meta-theme-hydrate", dangerouslySetInnerHTML: {
                    __html: `
let dc = document.getElementById('vxrn-theme-color')
let e1 = localStorage.getItem('${storageKey}')
let isD = 'system' === e1 || !e1 ? window.matchMedia('(prefers-color-scheme: dark)').matches : e1 === 'dark'
dc.setAttribute('content', isD ? '${darkColor}' : '${lightColor}')
          `,
                } })] }));
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50c3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFFTCxjQUFjLEVBQ2QsY0FBYyxJQUFJLGtCQUFrQixFQUNwQyxxQkFBcUIsR0FDdEIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxPQUFPLENBQUE7QUFLMUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRWxGLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQTtBQUVoQyxNQUFNLFVBQVUsR0FBRyxHQUFrQixFQUFFLENBQ3JDLENBQUMsT0FBTyxZQUFZLEtBQUssV0FBVyxJQUFLLFlBQVksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFtQixDQUFDO0lBQzVGLFFBQVEsQ0FBQTtBQUVWLE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FHaEM7SUFDRCxPQUFPLEVBQUUsUUFBUTtJQUNqQixNQUFNLEVBQUUsT0FBTztDQUNoQixDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsR0FBRyxFQUFFO0lBQ2pDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxrQkFBa0IsRUFBRSxDQUFBO0lBQ3BDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQVUsQ0FBQTtBQUMzQyxDQUFDLENBQUE7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCO0lBQzlCLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUN4QyxPQUFPLENBQUMsTUFBTSxFQUFFLGdCQUFnQixDQUFVLENBQUE7QUFDNUMsQ0FBQztBQUVELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxJQUFtQjtJQUNsRCxJQUFJLE9BQU8sWUFBWSxLQUFL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