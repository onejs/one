import { isWeb } from "@tamagui/constants";
import { MISSING_THEME_MESSAGE } from "./constants/constants.mjs";
import { formatDiagnostic } from "./helpers/formatDiagnostic.mjs";
import { prepareConfigRevision } from "./helpers/grammarConfig.mjs";

let conf;
let setConfigCalledByThisInstance = false;
const haventCalledErrorMessage = process.env.NODE_ENV === "development" ? `
Haven't called createTamagui yet. ${MISSING_THEME_MESSAGE}
` : `\u274C Error 001`;
const getConfigFromGlobalOrLocal = () => {
	if (conf) {
		return conf;
	}
	if (globalThis.__tamaguiConfig) {
		if (process.env.NODE_ENV === "development" && globalThis.__tamaguiEvaluationConfig !== globalThis.__tamaguiConfig && !globalThis.__tamaguiHasWarnedGlobalFallback && !globalThis.__tamaguiPendingCheck) {
			globalThis.__tamaguiPendingCheck = true;
			setTimeout(() => {
				if (!setConfigCalledByThisInstance && !globalThis.__tamaguiHasWarnedGlobalFallback) {
					globalThis.__tamaguiHasWarnedGlobalFallback = true;
					console.warn(`\u26A0\uFE0F\u26A0\uFE0F\u26A0\uFE0F\u26A0\uFE0F\u26A0\uFE0F

Tamagui: Using global config fallback. This may indicate duplicate tamagui instances (e.g., from Vite SSR bundling). This is handled automatically, but likely causes issues!

\u26A0\uFE0F\u26A0\uFE0F\u26A0\uFE0F\u26A0\uFE0F\u26A0\uFE0F`);
				}
				globalThis.__tamaguiPendingCheck = false;
			}, 500);
		}
		return globalThis.__tamaguiConfig;
	}
	return null;
};
const getSetting = (key) => {
	const config = getConfigFromGlobalOrLocal();
	if (process.env.NODE_ENV === "development") {
		if (!config) throw new Error(haventCalledErrorMessage);
	}
	return config.settings[key];
};
function getStyleCompat() {
	const config = getConfigFromGlobalOrLocal();
	return config?.settings?.styleCompat || "web";
}
const setConfig = (next) => {
	setConfigCalledByThisInstance = true;
	const previous = conf;
	const previousGlobal = globalThis.__tamaguiConfig;
	prepareConfigRevision(next);
	if (conf !== previous || globalThis.__tamaguiConfig !== previousGlobal) return;
	conf = next;
	globalThis.__tamaguiConfig = next;
	if (process.env.TAMAGUI_ENVIRONMENT === "tamagui") {
		globalThis.__tamaguiEvaluationConfig = next;
	}
};
const setConfigFont = (name, font, fontParsed) => {
	const config = getConfigFromGlobalOrLocal();
	if (process.env.NODE_ENV === "development") {
		if (!config) throw new Error(haventCalledErrorMessage);
	}
	config.fonts[name] = font;
	config.fontsParsed[name] = fontParsed;
	prepareConfigRevision(config);
};
const getConfig = () => {
	const config = getConfigFromGlobalOrLocal();
	if (!config) {
		throw new Error(formatDiagnostic("Err0", "TamaguiConfig", "no config is available", "Call createTamagui before rendering and deduplicate Tamagui package versions", "config", config));
	}
	return config;
};
const getConfigMaybe = () => {
	return getConfigFromGlobalOrLocal();
};
let tokens;
function setTokens(next) {
	tokens = next;
}
const getTokensParsed = () => getConfigFromGlobalOrLocal()?.tokensParsed ?? tokens;
const getTokens = () => {
	if (process.env.NODE_ENV === "development") {
		if (!getConfigFromGlobalOrLocal()) throw new Error(haventCalledErrorMessage);
	}
	return getTokensParsed();
};
const getTokenObject = (value, group) => {
	const tokens2 = getTokensParsed();
	return group ? tokens2[group]?.[value] : tokens2[Object.keys(tokens2).find((cat) => tokens2[cat][value]) || ""]?.[value];
};
const getToken = (value, group, useVariable = isWeb) => {
	const token = getTokenObject(value, group);
	return useVariable ? token?.variable : token?.val;
};
const getTokenValue = (value, group) => {
	if (value === "unset" || value === "auto") return;
	return getToken(value, group, false);
};
const useTokens = getTokens;
const getThemes = () => getConfigFromGlobalOrLocal().themes;
const updateConfig = (key, value) => {
	const config = getConfigFromGlobalOrLocal();
	if (!config || key === "__proto__" || !(key in config)) {
		return;
	}
	Object.assign(config[key], value);
	prepareConfigRevision(config);
};
const getFont = (name) => {
	const conf2 = getConfig();
	return conf2.fontsParsed[name] ?? Object.entries(conf2.fontsParsed).find(([k]) => conf2.fontsParsed[k]?.family?.["val"] === name)?.[1];
};
let devConfig;
function setupDev(conf2) {
	if (process.env.NODE_ENV === "development") {
		devConfig = conf2;
	}
}
function loadAnimationDriver(name, driver) {
	const config = getConfigFromGlobalOrLocal();
	if (!config) {
		if (process.env.NODE_ENV === "development") {
			console.warn("loadAnimationDriver called before createTamagui");
		}
		return;
	}
	if (config.animations && !("default" in config.animations)) {
		;
		config.animations = { default: config.animations };
	}
	if (config.animations) {
		;
		config.animations[name] = driver;
	} else {
		;
		config.animations = {
			default: driver,
			[name]: driver
		};
	}
}

export { devConfig, getConfig, getConfigMaybe, getFont, getSetting, getStyleCompat, getThemes, getToken, getTokenObject, getTokenValue, getTokens, loadAnimationDriver, setConfig, setConfigFont, setTokens, setupDev, updateConfig, useTokens };
//# sourceMappingURL=config.mjs.map
