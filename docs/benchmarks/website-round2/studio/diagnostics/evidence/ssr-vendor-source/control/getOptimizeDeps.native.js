import { webExtensions } from "../constants.native.js";

function getOptimizeDeps(mode) {
	var needsInterop = [
		"nativewind",
		"react-native-css-interop/jsx-runtime",
		"react-native-css-interop/jsx-dev-runtime",
		"react-native-css-interop",
		"secure-json-parse",
		"@react-native/normalize-colors",
		"@vxrn/vendor/react-19-prod",
		"@vxrn/vendor/react-19",
		"@vxrn/vendor/react-19-compiler-runtime",
		"@vxrn/vendor/react-dom-19",
		"@vxrn/vendor/react-dom-client-19",
		"@vxrn/vendor/react-dom-server.browser-19",
		"@vxrn/vendor/react-jsx-19",
		"@vxrn/vendor/react-jsx-dev-19",
		"react",
		"react/jsx-runtime",
		"react/jsx-dev-runtime",
		"react/compiler-runtime",
		"react-dom",
		"react-dom/server",
		"react-dom/client",
		"react-native-web-internals",
		"@react-native-masked-view/masked-view",
		"url-parse",
		"query-string",
		"escape-string-regexp",
		"use-latest-callback",
		"react-is",
		"fast-deep-equal",
		"@supabase/auth-helpers-react",
		"@supabase/postgres-js",
		"core-js",
		"parse-numeric-range",
		"use-sync-external-store",
		"use-sync-external-store/shim",
		"inline-style-prefixer",
		"@docsearch/react",
		"@algolia/autocomplete-core",
		"@algolia/autocomplete-plugin-algolia-insights",
		"@algolia/autocomplete-shared",
		"moti"
	];
	var depsToOptimize = [
		...needsInterop,
		"fast-xml-parser",
		"set-cookie-parser",
		"ipaddr.js",
		"cross-fetch",
		"pg",
		"react-native-svg",
		"react-native-screens",
		"ws",
		"lodash",
		"reading-time",
		"mdx-bundler/client",
		"gray-matter",
		"glob",
		"memoize-one",
		"css-in-js-utils",
		"hyphenate-style-name",
		"use-sync-external-store",
		"react-native-reanimated",
		"@react-navigation/core",
		"@react-navigation/native",
		"@react-navigation/elements",
		"@react-navigation/bottom-tabs",
		"@react-navigation/native-stack",
		"one",
		"one/drawer",
		"one/ui",
		"react-native-safe-area-context",
		"styleq",
		"fbjs",
		"@vxrn/universal-color-scheme",
		"@vxrn/color-scheme",
		"requires-port",
		"querystringify",
		"compare-versions",
		"strict-uri-encode",
		"decode-uri-component",
		"split-on-first",
		"filter-obj",
		"scheduler",
		"warn-once",
		"@radix-ui/react-compose-refs",
		"@radix-ui/react-slot",
		"nanoid",
		"swr",
		"swr/mutation",
		"one/zero",
		"refractor/lang/tsx",
		"invariant",
		"tamagui/linear-gradient",
		"@react-native/normalize-color",
		"react-native",
		"@floating-ui/react",
		"@floating-ui/react-dom",
		"tamagui",
		"reforest"
	];
	if (mode === "build") {
		depsToOptimize.push("@babel/runtime");
	}
	return {
		needsInterop,
		depsToOptimize,
		optimizeDeps: {
			include: depsToOptimize,
			exclude: [
				"util",
				"@swc/wasm",
				"@swc/core-darwin-arm64",
				"moti/author",
				"@hot-updater/cli-tools"
			],
			needsInterop,
			holdUntilCrawlEnd: false,
			rolldownOptions: {
				resolve: { extensions: webExtensions },
				transform: { define: { "process.env.EXPO_OS": "\"web\"" } },
				moduleTypes: {
					".js": "jsx",
					".ts": "ts",
					".tsx": "tsx"
				},
				shimMissingExports: true
			}
		}
	};
}

export { getOptimizeDeps };
//# sourceMappingURL=getOptimizeDeps.native.js.map
