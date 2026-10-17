import { useSyncExternalStore } from "react";
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
		for (const listener of clientMatchesListeners) {
			listener();
		}
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
	const clientStoreMatches = useSyncExternalStore(subscribeToClientMatches, getClientMatchesSnapshot, () => serverContext?.matches ?? []);
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
