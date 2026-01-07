import { useIsomorphicLayoutEffect } from "@vxrn/use-isomorphic-layout-effect";
import { useState, useMemo } from "react";
import { Appearance } from "react-native";
import { getSystemScheme, type Scheme } from "./systemScheme";

export type SchemeSetting = "system" | "light" | "dark";

export type UserScheme = {
  /** The user's preference: 'system', 'light', or 'dark' */
  setting: SchemeSetting;
  /** The resolved scheme: 'light' or 'dark' */
  value: Scheme;
  /** Update the scheme setting */
  set: (setting: SchemeSetting) => void;
};

type SchemeListener = (setting: SchemeSetting, value: Scheme) => void;

const listeners = new Set<SchemeListener>();
const storageKey = "vxrn-scheme";

let currentSetting: SchemeSetting = "system";
let currentValue: Scheme = "light";

// native: set up listener at module level
if (process.env.TAMAGUI_TARGET === "native") {
  Appearance.addChangeListener((next) => {
    if (currentSetting === "system" && next.colorScheme) {
      updateValueFromSystem();
    }
  });

  const cur = Appearance.getColorScheme();
  if (cur && currentSetting === "system") {
    currentValue = cur;
  }
}

// web: lazy listener setup for SSR safety
let isWebListening = false;
function startWebListener() {
  if (isWebListening) return;
  isWebListening = true;

  const matcher =
    typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: dark)") : null;

  const onSystemChange = () => {
    if (currentSetting === "system") {
      updateValueFromSystem();
    }
  };

  onSystemChange();
  matcher?.addEventListener?.("change", onSystemChange);
}

function resolveValue(setting: SchemeSetting): Scheme {
  if (setting === "system") {
    if (process.env.TAMAGUI_TARGET === "native") {
      return Appearance.getColorScheme() || "light";
    }
    return getSystemScheme();
  }
  return setting;
}

// Only update the resolved value when system theme changes (don't change setting)
function updateValueFromSystem() {
  const value = resolveValue("system");
  if (value !== currentValue) {
    currentValue = value;

    if (process.env.TAMAGUI_TARGET === "native") {
      Appearance.setColorScheme(value);
    }

    listeners.forEach((l) => {
      l(currentSetting, currentValue);
    });
  }
}

function updateScheme(setting: SchemeSetting) {
  const value = setting === "system" ? resolveValue("system") : setting;

  if (value !== currentValue || currentSetting !== setting) {
    currentSetting = setting;
    currentValue = value;

    if (process.env.TAMAGUI_TARGET === "native") {
      Appearance.setColorScheme(value);
    }

    listeners.forEach((l) => {
      l(currentSetting, currentValue);
    });
  }
}

export function setUserScheme(setting: SchemeSetting) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(storageKey, setting);
  }
  updateScheme(setting);
}

export function getUserScheme(): { setting: SchemeSetting; value: Scheme } {
  return { setting: currentSetting, value: currentValue };
}

export function onUserSchemeChange(listener: SchemeListener) {
  listeners.add(listener);
  listener(currentSetting, currentValue);
  return () => {
    listeners.delete(listener);
  };
}

export function useUserScheme(): UserScheme {
  const [state, setState] = useState(() => getUserScheme());

  useIsomorphicLayoutEffect(() => {
    // restore from localStorage on mount
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(storageKey) as SchemeSetting | null;
      if (stored) {
        updateScheme(stored);
      }
    }

    const dispose = onUserSchemeChange((setting, value) => {
      setState({ setting, value });
    });

    startWebListener();

    return dispose;
  }, []);

  return useMemo(
    () => ({
      setting: state.setting,
      value: state.value,
      set: setUserScheme,
    }),
    [state.setting, state.value],
  );
}
