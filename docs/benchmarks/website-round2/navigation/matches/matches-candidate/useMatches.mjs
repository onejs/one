import { startTransition, useEffect, useReducer } from "react";
import { useServerContext } from "./vite/one-server-only.mjs";

let clientMatches = [];
const clientMatchesListeners = /* @__PURE__ */ new Set();
function subscribeToClientMatches(callback) {
	clientMatchesListeners.add(callback);
	return () => clientMatchesListeners.delete(callback);
}
function getClientMatchesSnapshot() {
	return clientMatches;
}
function setClientMatches(matches) {
	clientMatches = matches;
	queueMicrotask(() => {
		startTransition(() => {
			for (const listener of clientMatchesListeners) {
				listener();
			}
		});
	});
}
function updateMatchLoaderData(routeId, loaderData) {
	clientMatches = clientMatches.map((m) => m.routeId === routeId ? {
		...m,
		loaderData
	} : m);
	for (const listener of clientMatchesListeners) {
		listener();
	}
}
function useMatches() {
	const serverContext = useServerContext();
	if (process.env.VITE_ENVIRONMENT === "ssr") {
		return serverContext?.matches ?? [];
	}
	const [clientStoreMatches, rerender] = useReducer(getClientMatchesSnapshot, void 0, getClientMatchesSnapshot);
	useEffect(() => {
		const unsubscribe = subscribeToClientMatches(rerender);
		rerender();
		return unsubscribe;
	}, []);
	return clientStoreMatches;
}
function useMatch(routeId) {
	const matches = useMatches();
	return matches.find((m) => m.routeId === routeId);
}
function usePageMatch() {
	const matches = useMatches();
	return matches[matches.length - 1];
}

export { getClientMatchesSnapshot, setClientMatches, subscribeToClientMatches, updateMatchLoaderData, useMatch, useMatches, usePageMatch };
//# sourceMappingURL=useMatches.mjs.map
