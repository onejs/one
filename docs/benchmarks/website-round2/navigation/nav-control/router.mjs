import { StackActions } from "@react-navigation/native";
import { Fragment, startTransition, useDeferredValue, useEffect, useReducer, useSyncExternalStore } from "react";
import { devtoolsRegistry } from "../devtools/registry.mjs";
import { resolveHref } from "../link/href.mjs";
import { openExternalURL } from "../link/openExternalURL.mjs";
import { resolve } from "../link/path.mjs";
import { checkBlocker } from "../useBlocker.mjs";
import { assertIsReady } from "../utils/assertIsReady.mjs";
import { getLoaderPath, getPreloadCSSPath, getPreloadPath } from "../utils/cleanUrl.mjs";
import { dynamicImport, isChunkLoadError } from "../utils/dynamicImport.mjs";
import { PLATFORM } from "../utils/platform.mjs";
import { isVersionStale } from "../skewProtection.mjs";
import { hasFileExtension, shouldLinkExternally, shouldPreloadRoute } from "../utils/url.mjs";
import { ParamValidationError, RouteValidationError, validateParams } from "../validateParams.mjs";
import { extractParamsFromState, extractPathnameFromHref, extractSearchFromHref, findRouteNodeFromState } from "./findRouteNode.mjs";
import { getRouteInfo } from "./getRouteInfo.mjs";
import { isStateAwaitingNavigatorMount } from "./isStateAwaitingNavigatorMount.mjs";
import { getRouteArtifactPaths } from "./getRouteArtifactPath.mjs";
import { getRoutes } from "./getRoutes.mjs";
import { setLastAction } from "./lastAction.mjs";
import { getResolvedLinking, resetLinking, setupLinking } from "./linkingConfig.mjs";
import { getSafeWindowPath, getSafeWindowPathname, getSafeWindowPathname as getSafeWindowPathname2, normalizeRoutePathname, stripTrailingSlash } from "./path.mjs";
import { sortRoutes } from "./sortRoutes.mjs";
import { getQualifiedRouteComponent } from "./useScreens.mjs";
import { preloadRouteModules } from "./useViteRoutes.mjs";
import { getNavigateAction } from "./utils/getNavigateAction.mjs";
import { setClientMatches } from "../useMatches.mjs";
import { findInterceptRoute, setNavigationType, storeInterceptState, updateURLWithoutNavigation } from "./interceptRoutes.mjs";
import { setSlotState } from "../views/Navigator.mjs";
import { clearNotFoundState, findNearestNotFoundRoute, setNotFoundState } from "../notFoundState.mjs";

let routeNode = null;
let rootComponent;
const protectedRouteRegistry = /* @__PURE__ */ new Map();
function registerProtectedRoutes(contextKey, guardedRedirects) {
	if (guardedRedirects.size === 0) protectedRouteRegistry.delete(contextKey);
	else protectedRouteRegistry.set(contextKey, guardedRedirects);
}
function unregisterProtectedRoutes(contextKey) {
	protectedRouteRegistry.delete(contextKey);
}
function getProtectedRedirect(href) {
	const normalizedHref = extractPathnameFromHref(href).replace(/^\/+|\/+$/g, "");
	for (const [contextKey, guardedRedirects] of protectedRouteRegistry) {
		const normalizedContextKey = contextKey.replace(/^\/+|\/+$/g, "");
		if (!normalizedContextKey || normalizedHref === normalizedContextKey || normalizedHref.startsWith(`${normalizedContextKey}/`)) {
			const routeName = normalizedHref.slice(normalizedContextKey.length).replace(/^\//, "").split("/")[0] || "index";
			const normalizedRouteName = routeName.replace(/\/index$/, "");
			if (guardedRedirects.has(routeName)) return guardedRedirects.get(routeName);
			if (guardedRedirects.has(normalizedRouteName)) return guardedRedirects.get(normalizedRouteName);
		}
	}
	return false;
}
function resolveProtectedHref(href) {
	let target = href;
	const visited = /* @__PURE__ */ new Set();
	while (!visited.has(target)) {
		visited.add(target);
		const redirectTo = getProtectedRedirect(target);
		if (redirectTo === false) return target;
		if (redirectTo === void 0) return;
		target = resolveHref(redirectTo);
	}
}
function isRouteProtected(href) {
	return getProtectedRedirect(href) !== false;
}
let hasAttemptedToHideSplash = false;
let initialState;
let rootState;
let initialPathname;
let lastIntendedPathname;
let nextState;
let routeInfo;
let splashScreenAnimationFrame;
let pendingNavigationPathname;
let pendingNavigationAction;
let navigationRef = null;
const rootStateSubscribers = /* @__PURE__ */ new Set();
const loadingStateSubscribers = /* @__PURE__ */ new Set();
const storeSubscribers = /* @__PURE__ */ new Set();
let currentMatches = [];
let validationState = { status: "idle" };
const validationStateSubscribers = /* @__PURE__ */ new Set();
function subscribeToValidationState(subscriber) {
	validationStateSubscribers.add(subscriber);
	return () => validationStateSubscribers.delete(subscriber);
}
function setValidationState(state) {
	validationState = state;
	for (const subscriber of validationStateSubscribers) subscriber(state);
	if (state.status === "error" && state.error) window.dispatchEvent(new CustomEvent("one-validation-error", { detail: {
		error: {
			message: state.error.message,
			name: state.error.name,
			stack: state.error.stack
		},
		href: state.lastValidatedHref,
		timestamp: Date.now()
	} }));
}
function getValidationState() {
	return validationState;
}
function useValidationState() {
	return useSyncExternalStore(subscribeToValidationState, getValidationState, getValidationState);
}
let cachedRouteNode = null;
let cachedRootComponent = null;
let cachedContext = null;
function initialize(context, ref, initialLocation, linking) {
	cleanUpState();
	if (context !== cachedContext || !cachedRouteNode) {
		cachedRouteNode = getRoutes(context, {
			ignoreEntryPoints: true,
			platform: PLATFORM
		});
		cachedRootComponent = cachedRouteNode ? getQualifiedRouteComponent(cachedRouteNode) : Fragment;
		cachedContext = context;
	}
	routeNode = cachedRouteNode;
	rootComponent = cachedRootComponent || Fragment;
	if (!routeNode && process.env.NODE_ENV === "production") throw new Error("No routes found");
	if (process.env.ONE_DEBUG_ROUTER && routeNode) {
		const formatRouteTree = (node, indent = "", isLast = true) => {
			const prefix = indent + (isLast ? "└─ " : "├─ ");
			const childIndent = indent + (isLast ? "   " : "│  ");
			const dynamicBadge = node.dynamic ? ` [${node.dynamic.map((d) => d.name).join(", ")}]` : "";
			const typeBadge = node.type !== "layout" ? ` (${node.type})` : "";
			const slotsBadge = node.slots?.size ? ` {@${Array.from(node.slots.keys()).join(", @")}}` : "";
			let line = `${prefix}${node.route || "/"}${dynamicBadge}${typeBadge}${slotsBadge}`;
			const visibleChildren = node.children.filter((child) => !child.internal);
			for (let i = 0; i < visibleChildren.length; i++) {
				const child = visibleChildren[i];
				const childIsLast = i === visibleChildren.length - 1;
				line += "\n" + formatRouteTree(child, childIndent, childIsLast);
			}
			return line;
		};
		console.info(`[one] \u{1F4CD} Route structure:
${formatRouteTree(routeNode)}`);
		if (routeNode.slots?.size) {
			console.info(`[one] \u{1F4E6} Slots on root layout:`);
			for (const [slotName, slotConfig] of routeNode.slots) console.info(`  @${slotName}:`, {
				defaultRoute: slotConfig.defaultRoute?.route,
				interceptRoutes: slotConfig.interceptRoutes.map((r) => ({
					route: r.route,
					intercept: r.intercept
				}))
			});
		}
	}
	navigationRef = ref;
	setupLinkingAndRouteInfo(initialLocation, linking);
	subscribeToNavigationChanges();
}
function cleanUpState() {
	initialState = void 0;
	initialPathname = void 0;
	lastIntendedPathname = void 0;
	rootState = void 0;
	nextState = void 0;
	routeInfo = void 0;
	pendingNavigationPathname = void 0;
	pendingNavigationAction = void 0;
	resetLinking();
	rootStateSubscribers.clear();
	storeSubscribers.clear();
}
function setupLinkingAndRouteInfo(initialLocation, linking) {
	initialState = setupLinking(routeNode, initialLocation, linking);
	initialPathname = initialLocation?.pathname ?? getSafeWindowPathname();
	if (initialState) {
		rootState = initialState;
		routeInfo = getRouteInfo(initialState);
	} else routeInfo = {
		unstable_globalHref: "",
		pathname: "",
		isIndex: false,
		params: {},
		segments: []
	};
}
function handleNavigationContainerStateChange(navState) {
	if (!navState) return;
	let state = { ...navState };
	if (state.key) {
		if (hashes[state.key]) {
			state.hash = hashes[state.key];
			delete hashes[state.key];
		}
	}
	if (!hasAttemptedToHideSplash) {
		hasAttemptedToHideSplash = true;
		splashScreenAnimationFrame = requestAnimationFrame(() => {});
	}
	if (shouldKeepPendingNavigationState(state)) return;
	if (nextOptions) {
		state = {
			...state,
			linkOptions: nextOptions
		};
		nextOptions = null;
	}
	let shouldUpdateSubscribers = nextState === state;
	nextState = void 0;
	if (state && state !== rootState) {
		updateState(state, void 0);
		shouldUpdateSubscribers = true;
	}
	if (shouldUpdateSubscribers) startTransition(() => {
		for (const subscriber of rootStateSubscribers) subscriber(state);
	});
}
function subscribeToNavigationChanges() {
	startTransition(() => {
		updateSnapshot();
		for (const subscriber of storeSubscribers) subscriber();
	});
}
function navigate(url, options) {
	return linkTo(resolveHref(url), "NAVIGATE", options);
}
function push(url, options) {
	return linkTo(resolveHref(url), "PUSH", options);
}
function dismiss(count) {
	if (process.env.ONE_DEBUG_ROUTER) console.info(`[one] \u{1F519} dismiss${count ? ` (${count})` : ""}`);
	navigationRef?.dispatch(StackActions.pop(count));
}
function replace(url, options) {
	return linkTo(resolveHref(url), "REPLACE", options);
}
function setParams(params = {}) {
	assertIsReady(navigationRef);
	return navigationRef?.current?.setParams(params);
}
function dismissAll() {
	if (process.env.ONE_DEBUG_ROUTER) console.info(`[one] \u{1F519} dismissAll`);
	navigationRef?.dispatch(StackActions.popToTop());
}
function goBack() {
	if (process.env.ONE_DEBUG_ROUTER) console.info(`[one] \u{1F519} goBack`);
	assertIsReady(navigationRef);
	navigationRef?.current?.goBack();
}
function canGoBack() {
	if (!navigationRef.isReady()) return false;
	return navigationRef?.current?.canGoBack() ?? false;
}
function canDismiss() {
	let state = rootState;
	while (state) {
		if (state.type === "stack" && state.routes.length > 1) return true;
		if (state.index === void 0) return false;
		state = state.routes?.[state.index]?.state;
	}
	return false;
}
function getSortedRoutes() {
	if (!routeNode) throw new Error("No routes");
	return routeNode.children.filter((route) => !route.internal).sort(sortRoutes);
}
function updateState(state, nextStateParam = state) {
	rootState = state;
	nextState = nextStateParam;
	if (isStateAwaitingNavigatorMount(state, routeNode)) {
		if (process.env.ONE_DEBUG_ROUTER) console.info(`[one] \u{1F9ED} keeping ${routeInfo?.pathname}: a navigator has not mounted`);
		return;
	}
	const nextRouteInfo = getRouteInfo(state);
	if (pendingNavigationPathname === nextRouteInfo.pathname) pendingNavigationPathname = void 0;
	if (!deepEqual(routeInfo, nextRouteInfo)) {
		if (process.env.ONE_DEBUG_ROUTER) {
			const from = routeInfo?.pathname || "(initial)";
			const to = nextRouteInfo.pathname;
			const params = Object.keys(nextRouteInfo.params || {}).length ? nextRouteInfo.params : void 0;
			console.info(`[one] \u{1F9ED} ${from} \u2192 ${to}`, params ? { params } : "");
		}
		routeInfo = nextRouteInfo;
	}
	if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
		window.__oneDevtools = {
			routeInfo: nextRouteInfo,
			rootState: state,
			routeNode,
			getRoutes: () => routeNode?.children || [],
			getLoaderTimingHistory: () => devtoolsRegistry.getLoaderTimingHistory?.() ?? [],
			getPreloadHistory
		};
		window.dispatchEvent(new CustomEvent("one-route-change", { detail: nextRouteInfo }));
	}
}
function consumePendingNavigationAction() {
	const action = pendingNavigationAction;
	pendingNavigationAction = void 0;
	return action;
}
function subscribeToRootState(subscriber) {
	rootStateSubscribers.add(subscriber);
	return () => {
		rootStateSubscribers.delete(subscriber);
	};
}
function notifyRootStateSubscribers(state) {
	for (const subscriber of rootStateSubscribers) subscriber(state);
}
function subscribeToStore(subscriber) {
	storeSubscribers.add(subscriber);
	return () => {
		storeSubscribers.delete(subscriber);
	};
}
function subscribeToLoadingState(subscriber) {
	loadingStateSubscribers.add(subscriber);
	return () => {
		loadingStateSubscribers.delete(subscriber);
	};
}
function setLoadingState(state) {
	startTransition(() => {
		for (const listener of loadingStateSubscribers) listener(state);
	});
}
let currentSnapshot = null;
function updateSnapshot() {
	currentSnapshot = getSnapshot();
}
function snapshot() {
	return currentSnapshot;
}
function getSnapshot() {
	return {
		linkTo,
		routeNode,
		rootComponent,
		linking: getResolvedLinking(),
		hasAttemptedToHideSplash,
		initialState,
		rootState,
		nextState,
		routeInfo,
		splashScreenAnimationFrame,
		navigationRef,
		rootStateSubscribers,
		storeSubscribers
	};
}
function rootStateSnapshot() {
	return rootState;
}
function routeInfoSnapshot() {
	return routeInfo;
}
function getBrowserPathname() {
	const pathname = getSafeWindowPathname();
	return pathname === void 0 ? void 0 : normalizeRoutePathname(pathname);
}
function shouldKeepPendingNavigationState(currentState) {
	if (!pendingNavigationPathname) return false;
	return getRouteInfo(currentState).pathname !== pendingNavigationPathname;
}
function shouldPreserveInitialRouteInfo(currentState) {
	if (!initialState || !routeInfo?.pathname) return false;
	const nextPathname = getRouteInfo(currentState).pathname;
	if (nextPathname === routeInfo.pathname) return false;
	if (nextPathname && nextPathname === pendingNavigationPathname) return false;
	const browserPathname = getBrowserPathname();
	if (nextPathname && browserPathname && nextPathname === browserPathname) return false;
	return true;
}
function useOneRouter() {
	return useDeferredValue(useSyncExternalStore(subscribeToStore, snapshot, snapshot));
}
function syncStoreRootState() {
	if (!navigationRef) throw new Error(`No navigationRef, possible duplicate One dep`);
	if (navigationRef.isReady()) {
		const currentState = navigationRef.getRootState();
		if (rootState !== currentState) {
			if (shouldKeepPendingNavigationState(currentState)) return;
			if (shouldPreserveInitialRouteInfo(currentState)) return;
			updateState(currentState);
		}
	}
}
function useRootStateSnapshot(snapshot2) {
	const [state, rerender] = useReducer(snapshot2, void 0, snapshot2);
	useEffect(() => {
		const unsubscribe = subscribeToRootState(rerender);
		rerender();
		return unsubscribe;
	}, []);
	const browserPath = getSafeWindowPath();
	return browserPath !== void 0 && routeInfo?.unstable_globalHref === browserPath + window.location.hash ? snapshot2() : state;
}
function useStoreRootState() {
	syncStoreRootState();
	return useDeferredValue(useRootStateSnapshot(rootStateSnapshot));
}
function useStoreRouteInfo() {
	syncStoreRootState();
	return useRootStateSnapshot(routeInfoSnapshot);
}
function cleanup() {
	if (splashScreenAnimationFrame) cancelAnimationFrame(splashScreenAnimationFrame);
}
const preloadingLoader = {};
const PRELOAD_MAP_MAX = 200;
function setBoundedPreloadRecord(record, key, value) {
	if (!(key in record)) {
		const keys = Object.keys(record);
		if (keys.length >= PRELOAD_MAP_MAX) delete record[keys[0]];
	}
	record[key] = value;
}
async function doPreloadDev(href) {
	if (process.env.NODE_ENV === "development") {
		const startTime = performance.now();
		const normalizedPath = normalizeLoaderPath(href);
		if (globalThis["__vxrnHeadless"]) return null;
		try {
			const loaderJSUrl = getLoaderPath(href, true);
			const moduleLoadStart = performance.now();
			const modulePromise = dynamicImport(loaderJSUrl, false);
			if (!modulePromise) return null;
			const module = await modulePromise.catch(() => null);
			const moduleLoadTime = performance.now() - moduleLoadStart;
			if (!module?.loader) return null;
			const executionStart = performance.now();
			const result = await module.loader();
			const executionTime = performance.now() - executionStart;
			const totalTime = performance.now() - startTime;
			if (result?.__oneRedirect) return result;
			devtoolsRegistry.recordLoaderTiming?.({
				path: normalizedPath,
				startTime,
				moduleLoadTime,
				executionTime,
				totalTime,
				source: "preload"
			});
			return result ?? null;
		} catch (err) {
			const totalTime = performance.now() - startTime;
			devtoolsRegistry.recordLoaderTiming?.({
				path: normalizedPath,
				startTime,
				totalTime,
				error: err instanceof Error ? err.message : String(err),
				source: "preload"
			});
			if (process.env.ONE_DEBUG_ROUTER) console.warn(`[one] dev preload failed for ${href}:`, err);
			return null;
		}
	}
}
async function doPreload(href) {
	if (globalThis["__vxrnHeadless"]) return null;
	const artifactPaths = getRouteArtifactPaths(href, getResolvedLinking(), routeNode);
	const preloadPath = getPreloadPath(artifactPaths.preload);
	const loaderPath = getLoaderPath(artifactPaths.loader);
	const cssPreloadPath = getPreloadCSSPath(artifactPaths.preload);
	recordPreloadStart(href);
	try {
		const [_preload, cssPreloadModule, loader] = await Promise.all([
			dynamicImport(preloadPath, false),
			dynamicImport(cssPreloadPath, false),
			dynamicImport(loaderPath, false),
			preloadRouteModules(href)
		]);
		const hasCss = !!cssPreloadModule?.injectCSS;
		if (hasCss) setBoundedCssInject(href, cssPreloadModule.injectCSS);
		if (!!!loader?.loader) {
			recordPreloadComplete(href, false, hasCss);
			return null;
		}
		const result = await loader.loader();
		if (result?.__oneRedirect) return result;
		recordPreloadComplete(href, true, hasCss);
		return result ?? null;
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		console.error(`[one] preload error for ${href}:`, err);
		recordPreloadError(href, errorMessage);
		throw err;
	}
}
const preloadedLoaderData = {};
const cssInjectFunctions = {};
function setBoundedCssInject(key, value) {
	if (!(key in cssInjectFunctions)) {
		const keys = Object.keys(cssInjectFunctions);
		if (keys.length >= PRELOAD_MAP_MAX) delete cssInjectFunctions[keys[0]];
	}
	cssInjectFunctions[key] = value;
}
const preloadHistory = [];
const MAX_PRELOAD_HISTORY = 30;
function recordPreloadStart(href) {
	if (process.env.NODE_ENV !== "development") return;
	const existing = preloadHistory.find((p) => p.href === href);
	if (existing) {
		existing.status = "loading";
		existing.startTime = performance.now();
		return;
	}
	preloadHistory.unshift({
		href,
		status: "loading",
		startTime: performance.now(),
		hasLoader: false,
		hasCss: false
	});
	if (preloadHistory.length > MAX_PRELOAD_HISTORY) preloadHistory.pop();
	dispatchPreloadEvent();
}
function recordPreloadComplete(href, hasLoader, hasCss) {
	if (process.env.NODE_ENV !== "development") return;
	const entry = preloadHistory.find((p) => p.href === href);
	if (entry) {
		entry.status = "loaded";
		entry.endTime = performance.now();
		entry.hasLoader = hasLoader;
		entry.hasCss = hasCss;
	}
	dispatchPreloadEvent();
}
function recordPreloadError(href, error) {
	if (process.env.NODE_ENV !== "development") return;
	const entry = preloadHistory.find((p) => p.href === href);
	if (entry) {
		entry.status = "error";
		entry.endTime = performance.now();
		entry.error = error;
	}
	dispatchPreloadEvent();
}
function dispatchPreloadEvent() {
	window.dispatchEvent(new CustomEvent("one-preload-update"));
}
function getPreloadHistory() {
	return preloadHistory;
}
function preloadRoute(href, injectCSS = false) {
	if (!shouldPreloadRoute(href)) return;
	if (process.env.NODE_ENV === "development") {
		const normalizedHref = normalizeLoaderPath(href);
		if (!preloadingLoader[normalizedHref]) setBoundedPreloadRecord(preloadingLoader, normalizedHref, doPreloadDev(href).then((data) => {
			setBoundedPreloadRecord(preloadedLoaderData, normalizedHref, data);
			return data;
		}));
		return preloadingLoader[normalizedHref];
	}
	if (!preloadingLoader[href]) setBoundedPreloadRecord(preloadingLoader, href, doPreload(href).then((data) => {
		setBoundedPreloadRecord(preloadedLoaderData, href, data);
		return data;
	}).catch((err) => {
		delete preloadingLoader[href];
		throw err;
	}));
	return preloadingLoader[href]?.then(async (data) => {
		if (injectCSS) {
			const inject = cssInjectFunctions[href];
			if (inject) await Promise.race([inject(), new Promise((r) => setTimeout(r, 800))]);
		}
		return data;
	}, (err) => {
		if (injectCSS && process.env.ONE_SKEW_PROTECTION !== "false" && isChunkLoadError(err)) {
			window.location.href = href;
			return new Promise(() => {});
		}
		return null;
	});
}
function normalizeLoaderPath(href) {
	return new URL(href, "http://example.com").pathname.replace(/\/index$/, "").replace(/\/$/, "") || "/";
}
function buildClientMatches(href, matchingNode, params, loaderData) {
	const pathname = extractPathnameFromHref(href);
	const routeId = matchingNode?.contextKey || pathname;
	const layoutMatches = currentMatches.filter((m) => m.routeId.includes("_layout"));
	const pageMatch = {
		routeId,
		pathname,
		params,
		loaderData
	};
	return [...layoutMatches, pageMatch];
}
function initClientMatches(matches) {
	currentMatches = matches;
	setClientMatches(matches);
}
async function linkTo(href, event, options) {
	if (process.env.ONE_DEBUG_ROUTER) console.info(`[one] \u{1F517} ${event || "NAVIGATE"} ${href}`);
	setNavigationType("soft");
	clearNotFoundState();
	if (href[0] === "#") return;
	if (shouldLinkExternally(href)) {
		openExternalURL(href);
		return;
	}
	if (hasFileExtension(href)) {
		window.location.href = href;
		return;
	}
	if (isVersionStale()) {
		window.location.href = href;
		return;
	}
	if (checkBlocker(href, event === "REPLACE" ? "replace" : "push")) return;
	const protectedHref = resolveProtectedHref(href);
	if (!protectedHref) return;
	if (protectedHref !== href) return linkTo(protectedHref, "REPLACE", options);
	const currentLayoutNode = routeNode;
	const currentPath = routeInfo?.pathname || "/";
	const interceptResult = findInterceptRoute(href, currentLayoutNode, currentPath);
	if (interceptResult) {
		const { interceptRoute, slotName, layoutContextKey, params: params2 } = interceptResult;
		const scopedSlotKey = `${layoutContextKey}:${slotName}`;
		storeInterceptState(scopedSlotKey, interceptRoute, params2);
		updateURLWithoutNavigation(href);
		setSlotState(scopedSlotKey, {
			activeRouteKey: interceptRoute.contextKey,
			activeRouteNode: interceptRoute,
			params: params2,
			isIntercepted: true
		});
		return;
	}
	assertIsReady(navigationRef);
	const current = navigationRef.current;
	if (current == null) throw new Error("Couldn't find a navigation object. Is your component inside NavigationContainer?");
	const linking = getResolvedLinking();
	if (!linking) throw new Error("Attempted to link to route when no routes are present");
	setLastAction();
	if (href === ".." || href === "../") {
		current.goBack();
		return;
	}
	if (href.startsWith(".")) {
		let base = routeInfo?.segments?.map((segment) => {
			if (!segment.startsWith("[")) return segment;
			if (segment.startsWith("[...")) {
				segment = segment.slice(4, -1);
				const params2 = routeInfo?.params?.[segment];
				if (Array.isArray(params2)) return params2.join("/");
				return params2?.split(",")?.join("/") ?? "";
			}
			segment = segment.slice(1, -1);
			return routeInfo?.params?.[segment];
		}).filter(Boolean).join("/") ?? "/";
		if (!routeInfo?.isIndex) base += "/..";
		href = resolve(base, href);
	}
	const state = linking.getStateFromPath(href, linking.config);
	if (!state || state.routes.length === 0) {
		console.error("Could not generate a valid navigation state for the given path: " + href);
		console.error(`linking.config`, linking.config);
		console.error(`routes`, getSortedRoutes());
		return;
	}
	setLoadingState("loading");
	const normalizedPreloadPath = normalizeLoaderPath(href);
	if (!(normalizedPreloadPath in preloadedLoaderData) && !(href in preloadedLoaderData)) await preloadRoute(href, true);
	else if (process.env.NODE_ENV !== "development") {
		const inject = cssInjectFunctions[href];
		if (inject) inject().catch(() => {});
	}
	const preloadResult = preloadedLoaderData[normalizedPreloadPath];
	if (preloadResult?.__oneRedirect) {
		const redirectTarget = preloadResult.__oneRedirect;
		delete preloadedLoaderData[normalizedPreloadPath];
		delete preloadingLoader[normalizedPreloadPath];
		delete preloadedLoaderData[href];
		delete preloadingLoader[href];
		setLoadingState("loaded");
		linkTo(redirectTarget, "REPLACE");
		return;
	}
	if (preloadResult?.__oneError === 404) {
		delete preloadedLoaderData[normalizedPreloadPath];
		delete preloadingLoader[normalizedPreloadPath];
		delete preloadedLoaderData[href];
		delete preloadingLoader[href];
		setLoadingState("loaded");
		const notFoundRoute = findNearestNotFoundRoute(href, routeNode);
		setNotFoundState({
			notFoundPath: preloadResult.__oneNotFoundPath || "/+not-found",
			notFoundRouteNode: notFoundRoute || void 0,
			originalPath: href
		});
		return;
	}
	const matchingRouteNode = findRouteNodeFromState(state, routeNode);
	if (matchingRouteNode?.loadRoute) {
		setValidationState({
			status: "validating",
			lastValidatedHref: href
		});
		try {
			const loadedRoute = matchingRouteNode.loadRoute();
			const params2 = extractParamsFromState(state);
			const search = extractSearchFromHref(href);
			const pathname = extractPathnameFromHref(href);
			if (loadedRoute.validateParams) validateParams(loadedRoute.validateParams, params2);
			if (loadedRoute.validateRoute) {
				const validationResult = await loadedRoute.validateRoute({
					params: params2,
					search,
					pathname,
					href
				});
				if (validationResult && !validationResult.valid) {
					const error = new RouteValidationError(validationResult.error || "Route validation failed", validationResult.details);
					setValidationState({
						status: "error",
						error,
						lastValidatedHref: href
					});
					throw error;
				}
			}
			setValidationState({
				status: "valid",
				lastValidatedHref: href
			});
		} catch (error) {
			if (error && typeof error.then === "function") {
				await error.catch(() => {});
				setValidationState({
					status: "valid",
					lastValidatedHref: href
				});
			} else if (error instanceof ParamValidationError || error instanceof RouteValidationError) {
				setValidationState({
					status: "error",
					error,
					lastValidatedHref: href
				});
				throw error;
			} else throw error;
		}
	}
	const loaderData = preloadedLoaderData[normalizeLoaderPath(href)];
	const params = extractParamsFromState(state);
	const newMatches = buildClientMatches(href, matchingRouteNode, params, loaderData);
	currentMatches = newMatches;
	setClientMatches(newMatches);
	if (!navigationRef.isReady()) {
		setLoadingState("loaded");
		return;
	}
	const currentRootState = navigationRef.getRootState();
	const hash = href.indexOf("#");
	if (currentRootState?.key && hash > 0) hashes[currentRootState.key] = href.slice(hash);
	nextOptions = options ?? null;
	pendingNavigationPathname = stripTrailingSlash(extractPathnameFromHref(href));
	pendingNavigationAction = event === "PUSH" || event === "REPLACE" || event === "NAVIGATE" ? event : void 0;
	lastIntendedPathname = pendingNavigationPathname;
	const freshRootState = navigationRef.getRootState();
	const currentRouteBeforeDispatch = navigationRef.getCurrentRoute();
	const targetPathname = pendingNavigationPathname;
	const optimisticState = nextOptions ? {
		...state,
		linkOptions: nextOptions
	} : state;
	const action = event === "REPLACE" ? null : getNavigateAction(state, freshRootState, event);
	startTransition(() => {
		updateState(optimisticState);
		pendingNavigationPathname = targetPathname;
		notifyRootStateSubscribers(optimisticState);
		if (!action) navigationRef.resetRoot(state);
		else {
			const targetName = action.payload?.name;
			const isGroupTarget = typeof targetName === "string" && targetName.startsWith("(") && targetName.endsWith(")");
			const hasFreshRootState = freshRootState.type === "stack";
			const isRootTarget = action.target === freshRootState.key;
			const currentFocusedRoute = freshRootState.routes[freshRootState.index];
			const currentFocusedName = currentFocusedRoute?.name;
			if (isRootTarget && isGroupTarget && hasFreshRootState) {
				const targetRoute = state.routes[state.index ?? state.routes.length - 1];
				const targetRootName = targetRoute.name;
				if (currentFocusedName === targetRootName) {
					const routes = [...freshRootState.routes];
					routes[freshRootState.index] = {
						...targetRoute,
						key: currentFocusedRoute?.key ?? targetRoute.key
					};
					navigationRef.resetRoot({
						...freshRootState,
						routes
					});
				} else {
					const existingTargetRoute = freshRootState.routes.find((route) => route.name === targetRootName);
					const existingRoutes = freshRootState.routes.filter((route) => route.name !== targetRootName);
					const nextRootState = {
						...freshRootState,
						routes: [...existingRoutes, {
							...targetRoute,
							key: existingTargetRoute?.key ?? `${targetRootName}-${freshRootState.key}`
						}],
						index: existingRoutes.length
					};
					navigationRef.resetRoot(nextRootState);
				}
			} else navigationRef.dispatch(action);
		}
	});
	let warningTm;
	const interval = setInterval(() => {
		if (!navigationRef.isReady()) {
			clearTimeout(warningTm);
			clearInterval(interval);
			return;
		}
		if (currentRouteBeforeDispatch !== navigationRef.getCurrentRoute()) setTimeout(() => {
			setLoadingState("loaded");
		});
		clearTimeout(warningTm);
		clearInterval(interval);
	}, 16);
	if (process.env.NODE_ENV === "development") warningTm = setTimeout(() => {
		console.warn(`Routing took more than 8 seconds`);
	}, 1e3);
}
const hashes = {};
let nextOptions = null;
function deepEqual(a, b) {
	if (a === b) return true;
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
		return true;
	}
	if (typeof a === "object" && typeof b === "object") {
		const keysA = Object.keys(a);
		const keysB = Object.keys(b);
		if (keysA.length !== keysB.length) return false;
		for (const key of keysA) if (!deepEqual(a[key], b[key])) return false;
		return true;
	}
	return false;
}

export { canDismiss, canGoBack, cleanup, consumePendingNavigationAction, dismiss, dismissAll, getPreloadHistory, getSafeWindowPathname2 as getSafeWindowPathname, getSortedRoutes, getValidationState, goBack, handleNavigationContainerStateChange, hasAttemptedToHideSplash, initClientMatches, initialPathname, initialState, initialize, isRouteProtected, lastIntendedPathname, linkTo, navigate, navigationRef, preloadRoute, preloadedLoaderData, preloadingLoader, push, registerProtectedRoutes, replace, resolveProtectedHref, rootComponent, rootState, rootStateSnapshot, routeInfo, routeInfoSnapshot, routeNode, setLoadingState, setParams, setValidationState, snapshot, subscribeToLoadingState, subscribeToRootState, subscribeToStore, subscribeToValidationState, unregisterProtectedRoutes, updateState, useOneRouter, useStoreRootState, useStoreRouteInfo, useValidationState };
//# sourceMappingURL=router.mjs.map
