import { createDebugger } from "@vxrn/debug";
import FSExtra from "fs-extra";
import path from "path";
import { createFilter } from "vite";
import { EXCLUDE_LIST, scanDepsToOptimize } from "../utils/scanDepsToOptimize.native.js";
import { getFileHash, lookupFile } from "../utils/utils.native.js";
import { getCacheDir } from "../utils/getCacheDir.native.js";

var name = "vxrn:auto-dep-optimize";
var { debug, debugDetails } = createDebugger(name);
function autoDepOptimizePlugin(props) {
	return {
		name,
		enforce: "pre",
		async config(cfg, env) {
			var _cfg_optimizeDeps, _cfg_ssr_optimizeDeps, _cfg_ssr, _cfg_ssr1;
			debug === null || debug === void 0 ? void 0 : debug("Config hook called");
			var userOptions = globalThis.__oneOptions;
			var depsConfig = userOptions === null || userOptions === void 0 ? void 0 : userOptions.deps;
			var exclude = depsConfig ? Object.entries(depsConfig).filter(function(param) {
				var [_, value] = param;
				return value === false;
			}).map(function(param) {
				var [k] = param;
				return k;
			}) : [];
			var userExcludes = Array.isArray(props.exclude) ? props.exclude : [props.exclude];
			var userViteExcludes = ((_cfg_optimizeDeps = cfg.optimizeDeps) === null || _cfg_optimizeDeps === void 0 ? void 0 : _cfg_optimizeDeps.exclude) || [];
			var userSsrExcludes = ((_cfg_ssr = cfg.ssr) === null || _cfg_ssr === void 0 ? void 0 : (_cfg_ssr_optimizeDeps = _cfg_ssr.optimizeDeps) === null || _cfg_ssr_optimizeDeps === void 0 ? void 0 : _cfg_ssr_optimizeDeps.exclude) || [];
			var finalConfig = await getScannedOptimizeDepsConfig({
				...props,
				mode: env.mode,
				external: (_cfg_ssr1 = cfg.ssr) === null || _cfg_ssr1 === void 0 ? void 0 : _cfg_ssr1.external,
				exclude: [
					...exclude,
					...userExcludes,
					...userViteExcludes,
					...userSsrExcludes
				].filter(Boolean)
			});
			debugDetails === null || debugDetails === void 0 ? void 0 : debugDetails(`Final auto-dep-optimize config: ${JSON.stringify(finalConfig, null, 2)}
from props: ${JSON.stringify(props)}`);
			return finalConfig;
		}
	};
}
var getSSRExternalsCachePath = function getSSRExternalsCachePath2(root) {
	return path.join(getCacheDir(root), "deps-to-pre-bundle-for-ssr-cache.json");
};
async function getScannedOptimizeDepsConfig(props) {
	var _props_onScannedDeps;
	var result = await findDepsToOptimize(props);
	(_props_onScannedDeps = props.onScannedDeps) === null || _props_onScannedDeps === void 0 ? void 0 : _props_onScannedDeps.call(props, result);
	var excludeArray = Array.isArray(props.exclude) ? props.exclude : [props.exclude];
	var excludeStrings = excludeArray.filter(function(e) {
		return typeof e === "string";
	});
	var excludeSet = new Set(excludeStrings);
	var external = props.external;
	var shouldOptimize = function shouldOptimize2(dep) {
		return !excludeSet.has(dep) && external !== true && !(external === null || external === void 0 ? void 0 : external.some(function(name2) {
			return dep === name2 || dep.startsWith(`${name2}/`);
		}));
	};
	var filteredDeps = result.prebundleDeps.filter(shouldOptimize);
	return { ssr: {
		optimizeDeps: {
			include: filteredDeps,
			exclude: EXCLUDE_LIST
		},
		noExternal: [...filteredDeps, ...result.noExternalDeps.filter(shouldOptimize)]
	} };
}
var sessionCacheVal = null;
async function findDepsToOptimize(param) {
	var { root, mode, exclude, include } = param;
	var cacheFilePath = getSSRExternalsCachePath(root);
	var startedAt = debug ? Date.now() : 0;
	var noCache = mode === "production";
	var sessionCache = mode === "production";
	if (sessionCache && sessionCacheVal) {
		return sessionCacheVal;
	}
	var lockFile = await lookupFile(root, [
		"yarn.lock",
		"package-lock.json",
		"pnpm-lock.yaml",
		"bun.lock",
		"bun.lockb"
	]);
	var lockFileHash = lockFile ? await getFileHash(lockFile) : void 0;
	var value;
	if (lockFileHash && !noCache) {
		try {
			var { lockFileHash: cachedLockFileHash, depsToPreBundleForSsr: cachedDepsToPreBundle } = await FSExtra.readJSON(cacheFilePath);
			if (lockFileHash === cachedLockFileHash && !!cachedDepsToPreBundle && "prebundleDeps" in cachedDepsToPreBundle && Array.isArray(cachedDepsToPreBundle.noExternalDeps)) {
				value = cachedDepsToPreBundle;
				debug === null || debug === void 0 ? void 0 : debug(`Using cached scan results from ${cacheFilePath}`);
			}
		} catch (err) {
			debug === null || debug === void 0 ? void 0 : debug(`${err}`);
		}
	}
	var filter = createFilter(include, exclude);
	if (!value) {
		value = await scanDepsToOptimize(`${root}/package.json`, { filter });
		if (sessionCache) {
			sessionCacheVal = value;
		}
		if (!noCache) {
			void FSExtra.outputJSON(cacheFilePath, {
				lockFileHash,
				depsToPreBundleForSsr: value
			});
		}
	}
	debug === null || debug === void 0 ? void 0 : debug(`Scanning completed in ${Date.now() - startedAt}ms`);
	debug === null || debug === void 0 ? void 0 : debug(`${value.prebundleDeps.length} deps are discovered and will be pre-bundled for SSR.` + (debugDetails ? "" : ` (Focus on this debug scope, "DEBUG=${debug.namespace}", to see more details.)`));
	debugDetails === null || debugDetails === void 0 ? void 0 : debugDetails(`Deps discovered to be pre-bundled for SSR: ${value.prebundleDeps.join(", ")}`);
	return value;
}

export { autoDepOptimizePlugin, findDepsToOptimize, getSSRExternalsCachePath, getScannedOptimizeDepsConfig };
//# sourceMappingURL=autoDepOptimizePlugin.native.js.map
