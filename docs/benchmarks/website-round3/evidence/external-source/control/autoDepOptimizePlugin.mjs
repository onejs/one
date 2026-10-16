import { createDebugger } from "@vxrn/debug";
import FSExtra from "fs-extra";
import path from "node:path";
import { createFilter } from "vite";
import { EXCLUDE_LIST, scanDepsToOptimize } from "../utils/scanDepsToOptimize.mjs";
import { getFileHash, lookupFile } from "../utils/utils.mjs";
import { getCacheDir } from "../utils/getCacheDir.mjs";

const name = "vxrn:auto-dep-optimize";
const { debug, debugDetails } = createDebugger(name);
function autoDepOptimizePlugin(props) {
	return {
		name,
		enforce: "pre",
		async config(cfg, env) {
			debug?.("Config hook called");
			const userOptions = globalThis.__oneOptions;
			const depsConfig = userOptions?.deps;
			const exclude = depsConfig ? Object.entries(depsConfig).filter(([_, value]) => value === false).map(([k]) => k) : [];
			const userExcludes = Array.isArray(props.exclude) ? props.exclude : [props.exclude];
			const userViteExcludes = cfg.optimizeDeps?.exclude || [];
			const userSsrExcludes = cfg.ssr?.optimizeDeps?.exclude || [];
			const finalConfig = await getScannedOptimizeDepsConfig({
				...props,
				mode: env.mode,
				exclude: [
					...exclude,
					...userExcludes,
					...userViteExcludes,
					...userSsrExcludes
				].filter(Boolean)
			});
			debugDetails?.(`Final auto-dep-optimize config: ${JSON.stringify(finalConfig, null, 2)}
from props: ${JSON.stringify(props)}`);
			return finalConfig;
		}
	};
}
const getSSRExternalsCachePath = (root) => {
	return path.join(getCacheDir(root), "deps-to-pre-bundle-for-ssr-cache.json");
};
async function getScannedOptimizeDepsConfig(props) {
	const result = await findDepsToOptimize(props);
	props.onScannedDeps?.(result);
	const excludeArray = Array.isArray(props.exclude) ? props.exclude : [props.exclude];
	const excludeStrings = excludeArray.filter((e) => typeof e === "string");
	const excludeSet = new Set(excludeStrings);
	const filteredDeps = result.prebundleDeps.filter((dep) => !excludeSet.has(dep));
	return { ssr: {
		optimizeDeps: {
			include: filteredDeps,
			exclude: EXCLUDE_LIST
		},
		noExternal: [...filteredDeps, ...result.noExternalDeps.filter((dep) => !excludeSet.has(dep))]
	} };
}
let sessionCacheVal = null;
async function findDepsToOptimize({ root, mode, exclude, include }) {
	const cacheFilePath = getSSRExternalsCachePath(root);
	const startedAt = debug ? Date.now() : 0;
	const noCache = mode === "production";
	const sessionCache = mode === "production";
	if (sessionCache && sessionCacheVal) {
		return sessionCacheVal;
	}
	const lockFile = await lookupFile(root, [
		"yarn.lock",
		"package-lock.json",
		"pnpm-lock.yaml",
		"bun.lock",
		"bun.lockb"
	]);
	const lockFileHash = lockFile ? await getFileHash(lockFile) : void 0;
	let value;
	if (lockFileHash && !noCache) {
		try {
			const { lockFileHash: cachedLockFileHash, depsToPreBundleForSsr: cachedDepsToPreBundle } = await FSExtra.readJSON(cacheFilePath);
			if (lockFileHash === cachedLockFileHash && !!cachedDepsToPreBundle && "prebundleDeps" in cachedDepsToPreBundle && Array.isArray(cachedDepsToPreBundle.noExternalDeps)) {
				value = cachedDepsToPreBundle;
				debug?.(`Using cached scan results from ${cacheFilePath}`);
			}
		} catch (err) {
			debug?.(`${err}`);
		}
	}
	const filter = createFilter(include, exclude);
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
	debug?.(`Scanning completed in ${Date.now() - startedAt}ms`);
	debug?.(`${value.prebundleDeps.length} deps are discovered and will be pre-bundled for SSR.` + (debugDetails ? "" : ` (Focus on this debug scope, "DEBUG=${debug.namespace}", to see more details.)`));
	debugDetails?.(`Deps discovered to be pre-bundled for SSR: ${value.prebundleDeps.join(", ")}`);
	return value;
}

export { autoDepOptimizePlugin, findDepsToOptimize, getSSRExternalsCachePath, getScannedOptimizeDepsConfig };
//# sourceMappingURL=autoDepOptimizePlugin.mjs.map
