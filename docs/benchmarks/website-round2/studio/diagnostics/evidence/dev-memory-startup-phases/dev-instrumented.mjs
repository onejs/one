const __recordMemoryPhase = (phase, server) => {
  const output = process.env.ONE_MEMORY_PHASE_DIR;
  if (!output) throw new Error('missing ONE_MEMORY_PHASE_DIR');
  const sample = {phase, memory:process.memoryUsage(), environments:server ? Object.fromEntries(Object.entries(server.environments).map(([name,env])=>[name,{optimizeDeps:env.config.optimizeDeps, modules:env.moduleGraph?.idToModuleMap.size}])) : undefined};
  requireMemoryFs.appendFileSync(output+'/phases.jsonl',JSON.stringify(sample)+'\n');
  requireMemoryFs.writeFileSync(output+'/'+phase+'-vmmap.txt',execFileSync('/usr/bin/vmmap',['-summary',String(process.pid)],{encoding:'utf8'}));
};
import * as requireMemoryFs from 'node:fs';
import { execFileSync } from "node:child_process";
import FSExtra from "fs-extra";
import colors from "picocolors";
import { debounce } from "perfect-debounce";
import { normalizePath } from "vite";

const { ensureDir } = FSExtra;
function readParentPid(pid) {
	try {
		const output = execFileSync("ps", [
			"-o",
			"ppid=",
			"-p",
			`${pid}`
		], {
			encoding: "utf8",
			stdio: [
				"ignore",
				"pipe",
				"ignore"
			]
		}).trim();
		const ppid = Number.parseInt(output, 10);
		return Number.isFinite(ppid) ? ppid : void 0;
	} catch {
		return void 0;
	}
}
function processExists(pid) {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return error.code !== "ESRCH";
	}
}
function setupOrphanDetection() {
	if (process.platform === "win32") return;
	const initialPpid = process.ppid;
	const launcherPid = readParentPid(initialPpid);
	if (initialPpid === 1 || launcherPid === 1) {
		process.exit(0);
	}
	const interval = setInterval(() => {
		if (process.ppid !== initialPpid || launcherPid !== void 0 && !processExists(launcherPid)) {
			process.exit(0);
		}
	}, 500);
	interval.unref();
}
function collectStartupGarbage(server) {
	const webEnvironmentsIdle = ["client", "ssr"].map((name) => server.environments[name]).filter(Boolean).map((environment) => environment.waitForRequestsIdle());
	void Promise.all(webEnvironmentsIdle).then(async () => {
		await new Promise((res) => setTimeout(res, 2e3).unref());
		const [v8, vm] = await Promise.all([import("node:v8"), import("node:vm")]);
		v8.setFlagsFromString("--expose-gc");
		const gc = vm.runInNewContext("gc");
		v8.setFlagsFromString("--no-expose-gc");
		gc();
	});
}
const dev = async (optionsIn) => {
	__recordMemoryPhase("dev-entry");
	setupOrphanDetection();
	const devStartTime = Date.now();
	process.env.IS_VXRN_CLI = "true";
	if (typeof optionsIn.debug === "string") {
		process.env.DEBUG ||= !optionsIn.debug ? `vite` : `vite:${optionsIn.debug}`;
	}
	const { startUserInterface } = await import("../user-interface/index.mjs");
	const { bindKeypressInput } = await import("../utils/bindKeypressInput.mjs");
	const { fillOptions } = await import("../config/getOptionsFilled.mjs");
	const { getViteServerConfig } = await import("../config/getViteServerConfig.mjs");
	const { printServerUrls } = await import("../utils/printServerUrls.mjs");
	const { prepareCacheForVersion } = await import("./clean.mjs");
	const { filterViteServerResolvedUrls } = await import("../utils/filterViteServerResolvedUrls.mjs");
	const { removeUndefined } = await import("../utils/removeUndefined.mjs");
	const { createServer, loadConfigFromFile } = await import("vite");
	__recordMemoryPhase("before-user-config");
	let { config } = await loadConfigFromFile({
		mode: "dev",
		command: "serve"
	}) ?? {};
	__recordMemoryPhase("after-user-config");
	if (!config) {
		console.error(`
\u26D4\uFE0F No vite.config.ts, please create a minimal config:

import { defineConfig } from 'vite'
import { one } from 'one/vite'

export default defineConfig({
  plugins: [
    one()
  ]
})

`);
		process.exit(0);
	}
	let extraPlugins = [];
	if (optionsIn.extraConfig) {
		const { resolve } = await import("node:path");
		const extraConfigPath = resolve(optionsIn.extraConfig);
		const extraResult = await loadConfigFromFile({
			mode: "dev",
			command: "serve"
		}, extraConfigPath);
		if (extraResult?.config) {
			const { mergeConfig } = await import("vite");
			extraPlugins = extraResult.config.plugins || [];
			config = mergeConfig(config, extraResult.config);
			console.info(colors.cyan(`Merged extra config from ${extraConfigPath}`));
		} else {
			console.warn(colors.yellow(`Could not load extra config from ${extraConfigPath}`));
		}
	}
	const oneServerConfig = config?.plugins?.find((x) => Array.isArray(x) && x[0]?.["name"] === "one:config")?.[0]?.["__get"]?.server;
	const viteServerConfig = config.server;
	const options = await fillOptions({
		...optionsIn,
		server: {
			...oneServerConfig,
			...removeUndefined({
				host: viteServerConfig?.host === true ? "0.0.0.0" : typeof viteServerConfig?.host === "string" ? viteServerConfig.host : void 0,
				https: viteServerConfig?.https,
				port: viteServerConfig?.port
			}),
			...removeUndefined(optionsIn.server || {})
		}
	});
	__recordMemoryPhase("after-fill-options");
	const { cacheDir } = options;
	bindKeypressInput();
	const cacheWasCleaned = await prepareCacheForVersion({
		root: options.root,
		cacheDir,
		versionHash: options.versionHash,
		forceClean: optionsIn.clean === true
	});
	if (options.clean || cacheWasCleaned) {
		process.env.METRO_RESET_CACHE = "1";
	}
	await ensureDir(cacheDir);
	await ensureDir(`${cacheDir}/compiler-cache`);
	const serverConfig = await getViteServerConfig(options, config);
	__recordMemoryPhase("after-server-config");
	serverConfig.plugins = [...serverConfig.plugins || [], ...extraPlugins];
	let viteServer = null;
	let isClosing = false;
	return {
		viteServer,
		start: async () => {
			viteServer = await createServer(serverConfig);
			__recordMemoryPhase("after-create-server",viteServer);
			const { connectedNativeClients } = await import("../utils/connectedNativeClients.mjs");
			const pendingTransforms = /* @__PURE__ */ new Map();
			viteServer.watcher.addListener("change", async (path) => {
				if (isClosing || connectedNativeClients === 0) {
					return;
				}
				const normalizedPath = normalizePath(path);
				if (normalizedPath.includes("/dist/")) {
					return;
				}
				const normalizedCwd = normalizePath(process.cwd());
				const id = normalizedPath.replace(normalizedCwd, "");
				if (!id.endsWith("tsx") && !id.endsWith("jsx")) {
					return;
				}
				if (!pendingTransforms.has(id)) {
					pendingTransforms.set(id, debounce(async () => {
						if (isClosing) return;
						try {
							await viteServer.transformRequest(id);
						} catch (err) {
							if (!isClosing) {
								console.info("err", err);
							}
						}
					}, 100));
				}
				pendingTransforms.get(id)();
			});
			viteServer.httpServer?.on("close", () => {
				isClosing = true;
			});
			await viteServer.listen();
			__recordMemoryPhase("after-listen",viteServer);
			collectStartupGarbage(viteServer);
			const totalStartupTime = Date.now() - devStartTime;
			console.info();
			console.info(colors.bold("Server running on") + " ⪢");
			console.info();
			const viteServerResolvedUrls = filterViteServerResolvedUrls(viteServer.resolvedUrls);
			if (viteServerResolvedUrls) {
				printServerUrls(viteServerResolvedUrls, {}, viteServer.config.logger.info);
			}
			startUserInterface({ server: viteServer });
			return { closePromise: new Promise((res) => {
				viteServer?.httpServer?.on("close", res);
			}) };
		},
		stop: () => {
			isClosing = true;
			if (viteServer) {
				viteServer.watcher.removeAllListeners();
				return viteServer.close();
			}
		}
	};
};

export { dev };
//# sourceMappingURL=dev.mjs.map
