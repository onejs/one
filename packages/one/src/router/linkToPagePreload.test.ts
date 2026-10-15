import { createNavigationContainerRef } from "@react-navigation/core";
import { afterEach, expect, it, vi } from "vitest";
import type { One } from "../vite/types";
import {
	initialize,
	preloadedLoaderData,
	preloadingLoader,
	replace,
	routeNode,
} from "./router";

const mocks = vi.hoisted(() => ({ dynamicImport: vi.fn() }));
vi.mock("../utils/dynamicImport", async (importOriginal) => ({
	...(await importOriginal<typeof import("../utils/dynamicImport")>()),
	dynamicImport: mocks.dynamicImport,
}));

afterEach(() => {
	delete preloadedLoaderData["/parallel"];
	delete preloadingLoader["/parallel"];
	mocks.dynamicImport.mockReset();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	vi.clearAllTimers();
	vi.useRealTimers();
});

it("starts the page module while loader data is pending and validates before dispatch", async () => {
	vi.useFakeTimers();
	vi.stubEnv("NODE_ENV", "development");
	vi.stubEnv("TAMAGUI_TARGET", "web");
	vi.stubGlobal("__vxrnHeadless", false);
	const files = {
		"./_layout.tsx": { default: () => null },
		"./index.tsx": { default: () => null },
		"./parallel.tsx": { default: () => null },
	};
	const context = ((id: string) => files[id]) as One.RouteContext;
	context.keys = () => Object.keys(files);
	context.resolve = (id) => id;
	context.id = "page-preload";
	const navigator = {
		isReady: () => true,
		getRootState: () => ({
			key: "stack-1",
			type: "stack",
			index: 0,
			stale: false,
			routeNames: ["index", "parallel"],
			routes: [{ key: "index-1", name: "index" }],
		}),
		getCurrentRoute: () => ({ key: "index-1", name: "index" }),
		resetRoot: vi.fn(),
		dispatch: vi.fn(),
		addListener: () => () => {},
		removeListener: () => {},
	};
	const ref = createNavigationContainerRef();
	ref.current = navigator as any;
	initialize(context, ref as any, new URL("http://one.test/"));

	let startLoader!: () => void;
	const started = new Promise<void>((done) => {
		startLoader = done;
	});
	let finishData!: (data: object) => void;
	const data = new Promise<object>((done) => {
		finishData = done;
	});
	let finishModule!: () => void;
	const pendingModule = new Promise<void>((done) => {
		finishModule = done;
	});
	let loaded = false;
	const validateParams = vi.fn();
	const loadRoute = vi.fn(() => {
		if (!loaded) throw pendingModule;
		return { default: () => null, validateParams };
	});
	routeNode!.children.find((node) => node.route === "parallel")!.loadRoute =
		loadRoute;
	mocks.dynamicImport.mockResolvedValue({
		loader: () => {
			startLoader();
			return data;
		},
	});
	const navigation = replace("/parallel");
	try {
		await started;
		expect(loadRoute).toHaveBeenCalledOnce();
		expect(navigator.resetRoot).not.toHaveBeenCalled();
		loaded = true;
		finishModule();
		await pendingModule;
		expect(navigator.resetRoot).not.toHaveBeenCalled();
	} finally {
		loaded = true;
		finishModule();
		finishData({ ready: true });
		await navigation;
	}
	expect(validateParams).toHaveBeenCalledOnce();
	expect(navigator.resetRoot).toHaveBeenCalledOnce();
});
