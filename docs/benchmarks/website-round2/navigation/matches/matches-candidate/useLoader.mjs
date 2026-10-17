import { useCallback, useSyncExternalStore } from "react";
import { registerDevtoolsFunction } from "./devtools/registry.mjs";
import { useParams, usePathname } from "./hooks.mjs";
import { findNearestNotFoundRoute, setNotFoundState } from "./notFoundState.mjs";
import { useContextKey } from "./router/Route.mjs";
import { getContextKey } from "./router/matchers.mjs";
import { router } from "./router/imperative-api.mjs";
import { preloadedLoaderData, preloadingLoader, routeNode } from "./router/router.mjs";
import { setSSRLoaderData, ssrLoaderData } from "./server/ssrLoaderData.mjs";
import { getClientMatchesSnapshot, updateMatchLoaderData, useMatches } from "./useMatches.mjs";
import { getLoaderPath } from "./utils/cleanUrl.mjs";
import { dynamicImport } from "./utils/dynamicImport.mjs";
import { weakKey } from "./utils/weakKey.mjs";
import { useServerContext } from "./vite/one-server-only.mjs";

process.env.ONE_LOADER_TIMEOUT_MS && +process.env.ONE_LOADER_TIMEOUT_MS;
const loaderTimingHistory = [];
const MAX_TIMING_HISTORY = 50;
const recordLoaderTiming = process.env.NODE_ENV === "development" ? (entry) => {
	loaderTimingHistory.unshift(entry);
	if (loaderTimingHistory.length > MAX_TIMING_HISTORY) loaderTimingHistory.pop();
	if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
		window.dispatchEvent(new CustomEvent("one-loader-timing", { detail: entry }));
		if (entry.error) window.dispatchEvent(new CustomEvent("one-error", { detail: {
			error: {
				message: entry.error,
				name: "LoaderError"
			},
			route: { pathname: entry.path },
			timestamp: Date.now(),
			type: "loader"
		} }));
	}
} : void 0;
function getLoaderTimingHistory() {
	return loaderTimingHistory;
}
registerDevtoolsFunction("getLoaderTimingHistory", getLoaderTimingHistory);
registerDevtoolsFunction("recordLoaderTiming", recordLoaderTiming);
const loaderState = {};
const subscribers = /* @__PURE__ */ new Set();
const LOADER_STATE_MAX = 200;
const loaderStateKeys = [];
function setBoundedLoaderState(path, entry) {
	if (!(path in loaderState)) {
		loaderStateKeys.push(path);
		if (loaderStateKeys.length > LOADER_STATE_MAX) {
			const oldest = loaderStateKeys.shift();
			delete loaderState[oldest];
		}
	}
	loaderState[path] = entry;
}
function updateState(path, updates) {
	setBoundedLoaderState(path, {
		...loaderState[path],
		...updates
	});
	subscribers.forEach((callback) => {
		callback();
	});
}
function subscribe(callback) {
	subscribers.add(callback);
	return () => subscribers.delete(callback);
}
function getLoaderState(path, preloadedData) {
	if (!(path in loaderState)) setBoundedLoaderState(path, {
		data: preloadedData,
		error: void 0,
		promise: void 0,
		state: "idle",
		hasLoadedOnce: !!preloadedData
	});
	return loaderState[path];
}
async function refetchLoader(pathname) {
	const startTime = performance.now();
	updateState(pathname, {
		state: "loading",
		error: null
	});
	try {
		const loaderJSUrl = getLoaderPath(pathname, true, `${Date.now()}`);
		const moduleLoadStart = performance.now();
		const module = await dynamicImport(loaderJSUrl)?.catch(() => null);
		const moduleLoadTime = performance.now() - moduleLoadStart;
		if (!module?.loader) {
			updateState(pathname, {
				data: void 0,
				state: "idle",
				hasLoadedOnce: true
			});
			return;
		}
		const executionStart = performance.now();
		const result = await module.loader();
		const executionTime = performance.now() - executionStart;
		const totalTime = performance.now() - startTime;
		if (result?.__oneRedirect) {
			recordLoaderTiming?.({
				path: pathname,
				startTime,
				moduleLoadTime,
				executionTime,
				totalTime,
				source: "refetch"
			});
			updateState(pathname, {
				data: void 0,
				state: "idle",
				hasLoadedOnce: true
			});
			router.replace(result.__oneRedirect);
			return;
		}
		if (result?.__oneError === 404) {
			recordLoaderTiming?.({
				path: pathname,
				startTime,
				moduleLoadTime,
				executionTime,
				totalTime,
				source: "refetch"
			});
			const notFoundRoute = findNearestNotFoundRoute(pathname, routeNode);
			setNotFoundState({
				notFoundPath: result.__oneNotFoundPath || "/+not-found",
				notFoundRouteNode: notFoundRoute || void 0,
				originalPath: pathname
			});
			return;
		}
		updateState(pathname, {
			data: result,
			state: "idle",
			timestamp: Date.now(),
			hasLoadedOnce: true
		});
		const currentMatches = getClientMatchesSnapshot();
		const pageMatch = currentMatches[currentMatches.length - 1];
		const normalizedPathname = pathname.replace(/\/$/, "") || "/";
		const normalizedMatchPathname = (pageMatch?.pathname || "").replace(/\/$/, "") || "/";
		if (pageMatch && normalizedMatchPathname === normalizedPathname) updateMatchLoaderData(pageMatch.routeId, result);
		recordLoaderTiming?.({
			path: pathname,
			startTime,
			moduleLoadTime,
			executionTime,
			totalTime,
			source: "refetch"
		});
	} catch (err) {
		const totalTime = performance.now() - startTime;
		updateState(pathname, {
			error: err,
			state: "idle"
		});
		recordLoaderTiming?.({
			path: pathname,
			startTime,
			totalTime,
			error: err instanceof Error ? err.message : String(err),
			source: "refetch"
		});
		throw err;
	}
}
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") window.__oneRefetchLoader = refetchLoader;
async function refetchMatchLoader(routeId, currentPath) {
	const module = await dynamicImport(getLoaderPath(currentPath, true, `${Date.now()}`))?.catch(() => null);
	if (!module?.loader) return;
	const result = await module.loader();
	if (result?.__oneRedirect || result?.__oneError) return;
	updateMatchLoaderData(routeId, result);
}
function useLoaderState(loader) {
	const { loaderProps: loaderPropsFromServerContext, loaderData: loaderDataFromServerContext } = useServerContext() || {};
	const params = useParams();
	const pathname = usePathname();
	const currentPath = pathname.replace(/\/index$/, "").replace(/\/$/, "") || "/";
	if (typeof window === "undefined") {
		if (loader) {
			if (ssrLoaderData.has(loader)) return {
				data: ssrLoaderData.get(loader),
				refetch: async () => {},
				state: "idle"
			};
			const serverContext = useServerContext();
			if (serverContext?.matches) {
				const contextKey = useContextKey();
				const match = serverContext.matches.find((m) => getContextKey(m.routeId) === contextKey);
				if (match && match.loaderData !== void 0) return {
					data: match.loaderData,
					refetch: async () => {},
					state: "idle"
				};
			}
			return {
				data: useAsyncFn(loader, loaderPropsFromServerContext || {
					path: pathname,
					params
				}),
				refetch: async () => {},
				state: "idle"
			};
		}
		if (loaderDataFromServerContext !== void 0) return {
			data: loaderDataFromServerContext,
			refetch: async () => {},
			state: "idle"
		};
	}
	const matchRouteId = loader ? (() => {
		const result = loader();
		return typeof result === "string" && result.startsWith("./") ? result : null;
	})() : null;
	const clientMatches = useMatches();
	const preloadedData = loaderPropsFromServerContext?.path === currentPath ? loaderDataFromServerContext : void 0;
	const loaderStateEntry = useSyncExternalStore(subscribe, () => getLoaderState(currentPath, preloadedData), () => getLoaderState(currentPath, preloadedData));
	const refetch = useCallback(() => refetchLoader(currentPath), [currentPath]);
	if (matchRouteId) {
		const match = clientMatches.find((m) => m.routeId === matchRouteId);
		const isPageMatch = clientMatches.length > 0 && clientMatches[clientMatches.length - 1]?.routeId === matchRouteId;
		const matchPathNormalized = (match?.pathname || "").replace(/\/$/, "") || "/";
		const matchPathFresh = !isPageMatch || matchPathNormalized === currentPath;
		if (match && match.loaderData != null && matchPathFresh) return {
			data: match.loaderData,
			refetch: async () => {
				await refetchLoader(currentPath);
				const fresh = loaderState[currentPath];
				if (fresh?.data != null) updateMatchLoaderData(matchRouteId, fresh.data);
			},
			state: loaderStateEntry.state
		};
	}
	if (!loader) return {
		refetch,
		state: loaderStateEntry.state
	};
	if (!loaderStateEntry.data && !loaderStateEntry.promise && !loaderStateEntry.hasLoadedOnce) {
		const resolvedPreloadData = preloadedLoaderData[currentPath];
		if (resolvedPreloadData != null) {
			delete preloadedLoaderData[currentPath];
			delete preloadingLoader[currentPath];
			loaderStateEntry.data = resolvedPreloadData;
			loaderStateEntry.hasLoadedOnce = true;
		} else if (preloadingLoader[currentPath]) loaderStateEntry.promise = preloadingLoader[currentPath].then((val) => {
			delete preloadingLoader[currentPath];
			delete preloadedLoaderData[currentPath];
			if (val != null) updateState(currentPath, {
				data: val,
				hasLoadedOnce: true,
				promise: void 0
			});
			else updateState(currentPath, { promise: void 0 });
		}).catch((err) => {
			console.error(`Error running loader()`, err);
			delete preloadingLoader[currentPath];
			updateState(currentPath, {
				error: err,
				promise: void 0
			});
		});
		else {
			const loadData = async () => {
				const startTime = performance.now();
				try {
					const loaderJSUrl = getLoaderPath(currentPath, true);
					const moduleLoadStart = performance.now();
					const module = await dynamicImport(loaderJSUrl)?.catch(() => null);
					const moduleLoadTime = performance.now() - moduleLoadStart;
					if (!module?.loader) {
						updateState(currentPath, {
							data: void 0,
							hasLoadedOnce: true,
							promise: void 0
						});
						return;
					}
					const executionStart = performance.now();
					const result = await module.loader();
					const executionTime = performance.now() - executionStart;
					const totalTime = performance.now() - startTime;
					if (result?.__oneRedirect) {
						recordLoaderTiming?.({
							path: currentPath,
							startTime,
							moduleLoadTime,
							executionTime,
							totalTime,
							source: "initial"
						});
						updateState(currentPath, {
							data: void 0,
							hasLoadedOnce: true,
							promise: void 0
						});
						router.replace(result.__oneRedirect);
						return;
					}
					if (result?.__oneError === 404) {
						recordLoaderTiming?.({
							path: currentPath,
							startTime,
							moduleLoadTime,
							executionTime,
							totalTime,
							source: "initial"
						});
						const notFoundRoute = findNearestNotFoundRoute(currentPath, routeNode);
						setNotFoundState({
							notFoundPath: result.__oneNotFoundPath || "/+not-found",
							notFoundRouteNode: notFoundRoute || void 0,
							originalPath: currentPath
						});
						return;
					}
					updateState(currentPath, {
						data: result,
						hasLoadedOnce: true,
						promise: void 0
					});
					recordLoaderTiming?.({
						path: currentPath,
						startTime,
						moduleLoadTime,
						executionTime,
						totalTime,
						source: "initial"
					});
				} catch (err) {
					const totalTime = performance.now() - startTime;
					updateState(currentPath, {
						error: err,
						promise: void 0
					});
					recordLoaderTiming?.({
						path: currentPath,
						startTime,
						totalTime,
						error: err instanceof Error ? err.message : String(err),
						source: "initial"
					});
				}
			};
			loaderStateEntry.promise = loadData();
		}
	}
	if (loaderStateEntry.error && !loaderStateEntry.hasLoadedOnce) throw loaderStateEntry.error;
	if (loaderStateEntry.data === void 0 && loaderStateEntry.promise && !loaderStateEntry.hasLoadedOnce) throw loaderStateEntry.promise;
	return {
		data: loaderStateEntry.data,
		refetch,
		state: loaderStateEntry.state
	};
}
function useLoader(loader) {
	const { data } = useLoaderState(loader);
	return data;
}
const results = /* @__PURE__ */ new Map();
const started = /* @__PURE__ */ new Map();
const USE_ASYNC_FN_CACHE_MAX = 100;
function setBoundedResults(key, value) {
	if (results.size >= USE_ASYNC_FN_CACHE_MAX && !results.has(key)) {
		const firstKey = results.keys().next().value;
		if (firstKey !== void 0) {
			results.delete(firstKey);
			started.delete(firstKey);
		}
	}
	results.set(key, value);
}
function resetLoaderState() {
	results.clear();
	started.clear();
}
function useAsyncFn(val, props) {
	const key = (val ? weakKey(val) : "") + JSON.stringify(props);
	if (val) {
		if (!started.get(key)) {
			started.set(key, true);
			let next = val(props);
			if (next instanceof Promise) next = next.then((final) => {
				setBoundedResults(key, final);
			}).catch((err) => {
				console.error(`Error running loader()`, err);
				setBoundedResults(key, void 0);
			});
			setBoundedResults(key, next);
		}
	}
	const current = results.get(key);
	if (current instanceof Promise) throw current;
	return current;
}

export { getLoaderTimingHistory, refetchLoader, refetchMatchLoader, resetLoaderState, setSSRLoaderData, useLoader, useLoaderState };
//# sourceMappingURL=useLoader.mjs.map
