// react-native-web doesn't implement Appearance.setColorScheme
// and doesn't support Appearance being different from the prefers-color-scheme
// but its common to want to have a way to force override the scheme
// this implements a setColorScheme and getColorScheme that can override system
import { useIsomorphicLayoutEffect } from '@vxrn/use-isomorphic-layout-effect';
import { useState } from 'react';
import { Appearance } from 'react-native';
const listeners = new Set();
let currentSetting = 'system';
let currentName = 'light';
// only runs once a hook is used to ensure it SSRs safely
let isListening = false;
function startWebMediaListener() {
    if (isListening)
        return;
    isListening = true;
    getWebIsDarkMatcher()?.addEventListener?.('change', (val) => {
        if (currentSetting === 'system') {
            update(getSystemColorScheme());
        }
    });
}
export function setColorScheme(next) {
    update(next);
}
export function getColorScheme() {
    return currentName;
}
export function onColorSchemeChange(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
export function useColorScheme() {
    const [state, setState] = useState(getColorScheme());
    useIsomorphicLayoutEffect(() => {
        startWebMediaListener();
        return onColorSchemeChange((setting, val) => setState(val));
    }, []);
    return [state, setColorScheme];
}
if (process.env.TAMAGUI_TARGET === 'native') {
    Appearance.addChangeListener((next) => {
        if (currentSetting === 'system') {
            if (next.colorScheme) {
                update(next.colorScheme);
            }
        }
    });
    const cur = Appearance.getColorScheme();
    if (cur && currentSetting === 'system') {
        currentName = cur;
    }
}
export function useColorSchemeSetting() {
    const [state, setState] = useState(getColorSchemeSetting());
    useIsomorphicLayoutEffect(() => {
        startWebMediaListener();
        return onColorSchemeChange(() => setState(getColorSchemeSetting()));
    }, []);
    return [state, setColorScheme];
}
// internals
const getColorSchemeSetting = () => {
    return currentSetting;
};
const getWebIsDarkMatcher = () => typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : null;
function getSystemColorScheme() {
    if (process.env.TAMAGUI_TARGET === 'native') {
        return Appearance.getColorScheme() || 'light';
    }
    return getWebIsDarkMatcher()?.matches ? 'dark' : 'light';
}
function update(setting) {
    const next = setting === 'system' ? getSystemColorScheme() : setting;
    if (next !== currentName || currentSetting !== setting) {
        currentSetting = setting;
        currentName = next;
        if (process.env.TAMAGUI_TARGET === 'native') {
            Appearance.setColorScheme(next);
        }
        listeners.forEach((l) => l(currentSetting, currentName));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JTY2hlbWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb2xvclNjaGVtZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwrREFBK0Q7QUFDL0QsK0VBQStFO0FBQy9FLG9FQUFvRTtBQUNwRSwrRUFBK0U7QUFFL0UsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLE9BQU8sQ0FBQTtBQUNoQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBTXpDLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFBO0FBRWhELElBQUksY0FBYyxHQUF1QixRQUFRLENBQUE7QUFDakQsSUFBSSxXQUFXLEdBQW9CLE9BQU8sQ0FBQTtBQUUxQyx5REFBeUQ7QUFDekQsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFBO0FBQ3ZCLFNBQVMscUJBQXFCO0lBQzVCLElBQUksV0FBVztRQUFFLE9BQU07SUFDdkIsV0FBVyxHQUFHLElBQUksQ0FBQTtJQUNsQixtQkFBbUIsRUFBRSxFQUFFLGdCQUFnQixFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDMUQsSUFBSSxjQUFjLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDaEMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQTtRQUNoQyxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSixDQUFDO0FBRUQsTUFBTSxVQUFVLGNBQWMsQ0FBQyxJQUF3QjtJQUNyRCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDZCxDQUFDO0FBRUQsTUFBTSxVQUFVLGNBQWM7SUFDNUIsT0FBTyxXQUFXLENBQUE7QUFDcEIsQ0FBQztBQUVELE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxRQUE2QjtJQUMvRCxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3ZCLE9BQU8sR0FB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