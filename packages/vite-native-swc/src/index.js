import { transform, } from '@swc/core';
import { createRequire } from 'node:module';
import { extname } from 'node:path';
import { transformGenerators } from './transformBabel';
// this file is a mess lol
// TODO we arent reading .env early enough to just put this in parent scope
function shouldSourceMap() {
    return process.env.VXRN_ENABLE_SOURCE_MAP === '1';
}
// TODO node has an import to do this: const require = createRequire(import.meta.url)
const resolve = createRequire(typeof __filename !== 'undefined' ? __filename : import.meta.url).resolve;
const refreshContentRE = /\$Refresh(?:Reg|Sig)\$\(/;
const isWebContainer = globalThis.process?.versions?.webcontainer;
const parsers = {
    '.tsx': { syntax: 'typescript', tsx: true, decorators: true },
    '.ts': { syntax: 'typescript', tsx: false, decorators: true },
    '.jsx': { syntax: 'ecmascript', jsx: true },
    '.js': { syntax: 'ecmascript' },
    // JSX is required to trigger fast refresh transformations, even if MDX already transforms it
    '.mdx': { syntax: 'ecmascript', jsx: true },
};
const SWC_ENV = {
    targets: {
        node: '4',
    },
    include: [],
    // this breaks the uniswap app for any file with a ...spread
    exclude: [
        'transform-spread',
        'transform-destructuring',
        'transform-object-rest-spread',
        // `transform-async-to-generator` is relying on `transform-destructuring`.
        // If we exclude `transform-destructuring` but not `transform-async-to-generator`, the SWC binary will panic
        // with error: `called `Option::unwrap()` on a `None` value`.
        // See: https://github.com/swc-project/swc/blob/v1.7.14/crates/swc_ecma_compat_es2015/src/generator.rs#L703-L705
        'transform-async-to-generator',
        'transform-regenerator', // Similar to above
    ],
};
function getParser(id, forceJSX = false) {
    if (id.endsWith('one-entry-native')) {
        return parsers['.tsx'];
    }
    const extension = extname(id);
    let parser = !extension ? parsers['.js'] : parsers[extension];
    // compat
    if (extension === '.js') {
        if (forceJSX) {
            parser = parsers['.jsx'];
        }
        if (id.includes('expo-modules-core')) {
            parser = parsers['.jsx'];
        }
    }
    return parser;
}
export default (_options) => {
    const hasTransformed = {};
    const asyncGeneratorRegex = /(async \*|async function\*|for await)/;
    const transformWithoutGenerators = async (code, id) => {
        const parser = getParser(id);
        hasTransformed[id] = true;
        return await transform(code, {
            filename: id,
            swcrc: false,
            configFile: false,
            sourceMaps: shouldSourceMap(),
            jsc: {
                parser,
                transform: {
                    useDefineForClassFields: true,
                    react: {
                        development: true,
                        refresh: false,
                        runtime: 'automatic',
                    },
                },
            },
            env: SWC_ENV,
        });
    };
    const transformWithGenerators = async (code, id) => {
        if (process.env.VXRN_USE_BABEL_FOR_GENERATORS) {
            return await transformGenerators(code);
        }
        const parser = getParser(id);
        hasTransformed[id] = true;
        return await transform(code, {
            filename: id,
            swcrc: false,
            configFile: false,
            sourceMaps: shouldSourceMap(),
            jsc: {
                parser,
                target: 'es5',
                transform: {
                    useDefineForClassFields: true,
                    react: {
                        development: !_options?.production,
                        refresh: false,
                        runtime: 'automatic',
                    },
                },
            },
        });
    };
    const options = {
        mode: _options?.mode ?? 'serve',
        jsxImportSource: _options?.jsxImportSource ?? 'react',
        tsDecorators: _options?.tsDecorators,
        plugins: _options?.plugins
            ? _options?.plugins.map((el) => [resolve(el[0]), el[1]])
            : undefined,
        production: _options?.production,
    };
    return [
        {
            name: 'vite:react-swc',
            enforce: 'pre',
            config: () => {
                const config = {
                    esbuild: false,
                    // We only serve bundles for React Native, so optimized deps will not be used anyway.
                    optimizeDeps: {
                        noDiscovery: true,
                    },
                    build: {
                        // idk why i need both..
                        rollupOptions: {
                            plugins: [
                                {
                                    name: `swc-react-native-transform`,
                                    options: {
                                        order: 'pre',
                                        handler(options) { },
                                    },
                                    async transform(code, id) {
                                        // cant actually do this! we should prebuild using swc probably
                                        // if (id.includes('react-native-prebuilt')) {
                                        //   return
                                        // }
                                        if (asyncGeneratorRegex.test(code)) {
                                            return await transformWithGenerators(code, id);
                                        }
                                        try {
                                            return await transformWithoutGenerators(code, id);
                                        }
                                        catch (err) {
                                            // seeing an error with /Users/n8/universe/node_modules/@floating-ui/core/dist/floating-ui.core.mjs
                                            // fallback to a different config:
                                            if (process.env.DEBUG === 'vxrn') {
                                                console.error(`${err}`);
                                            }
                                            return await transformWithGenerators(code, id);
                                        }
                                    },
                                },
                            ],
                        },
                    },
                };
                return {
                    environments: {
                        ios: config,
                        android: config,
                    },
                };
            },
            configResolved(config) {
                const mdxIndex = config.plugins.findIndex((p) => p.name === '@mdx-js/rollup');
                if (mdxIndex !== -1 &&
                    mdxIndex > config.plugins.findIndex((p) => p.name === 'vite:react-swc')) {
                    throw new Error('[vite:react-swc] The MDX plugin should be placed before this plugin');
                }
                if (isWebContainer) {
                    config.logger.warn('[vite:react-swc] SWC is currently not supported in WebContainers. You can use the default React plugin instead.');
                }
            },
            async transform(code, _id, transformOptions) {
                if (hasTransformed[_id])
                    return;
                if (_id.includes(`virtual:`)) {
                    return;
                }
                if (asyncGeneratorRegex.test(code)) {
                    return await transformWithGenerators(code, _id);
                }
                const out = await swcTransform(_id, code, options);
                hasTransformed[_id] = true;
                return out;
            },
        },
    ];
};
export async function swcTransform(_id, code, options) {
    // todo hack
    const id = _id.split('?')[0].replace(process.cwd(), '');
    // const refresh = !transformOptions?.ssr && !hmrDisabled
    // only change for now:
    const refresh = options.production || options.noHMR ? false : !options.forceJSX;
    const result = await transformWithOptions(id, code, options, {
        refresh,
        development: !options.forceJSX && !options.production,
        runtime: 'automatic',
        importSource: options.jsxImportSource,
    });
    if (!result) {
        return;
    }
    if (!refresh || !refreshContentRE.test(result.code)) {
        return result;
    }
    result.code = wrapSourceInRefreshRuntime(id, result.code, options);
    if (result.map) {
        const sourceMap = JSON.parse(result.map);
        sourceMap.mappings = ';;;;;;;;' + sourceMap.mappings;
        return { code: result.code, map: sourceMap };
    }
    return { code: result.code };
}
const SHARED_MODULE_CONFIG = {
    importInterop: 'none', // We want SWC to transform imports to require since there's no Rollup to handle them afterwards, but without adding any interop helpers that would break with our RN module system
};
export const transformWithOptions = async (id, code, options, reactConfig) => {
    const parser = getParser(id, options.forceJSX);
    if (!parser)
        return;
    let result;
    try {
        const transformOptions = {
            filename: id,
            swcrc: false,
            configFile: false,
            sourceMaps: shouldSourceMap(),
            module: {
                ...SHARED_MODULE_CONFIG,
                type: 'nodenext',
            },
            ...(options.mode === 'serve-cjs' && {
                module: {
                    ...SHARED_MODULE_CONFIG,
                    type: 'commonjs',
                    strict: true,
                },
            }),
            jsc: {
                parser,
                transform: {
                    useDefineForClassFields: true,
                    react: reactConfig,
                },
                ...(options.forceJSX ? { target: 'esnext' } : {}),
            },
            ...(options.forceJSX ? {} : { env: SWC_ENV }),
        };
        result = await transform(code, transformOptions);
    }
    catch (e) {
        // try another config?
        console.info(`SWC failed to transform file, but sometimes this is fine so continuing... Please report: ${id} ${e.message}`);
        return { code };
        // const message: string = e.message
        // const fileStartIndex = message.indexOf('╭─[')
        // if (fileStartIndex !== -1) {
        //   const match = message.slice(fileStartIndex).match(/:(\d+):(\d+)]/)
        //   if (match) {
        //     e.line = match[1]
        //     e.column = match[2]
        //   }
        // }
        // throw e
    }
    return result;
};
function wrapSourceInRefreshRuntime(id, code, options) {
    const prefixCode = options.mode === 'build'
        ? `
  // ensure it loads react, react native, vite client
  import 'react-native'
  import 'react'
  import '@vxrn/vite-native-client'
  `
        : ``;
    if (options.production) {
        return `
  ${prefixCode}

  module.url = '${id}'

  ${code}
    `;
    }
    if (code.includes('RefreshRuntime = __cachedModules')) {
        console.warn('[wrapSourceInRefreshRuntime] detected refresh runtime already in code, skipping');
        return code;
    }
    return `const RefreshRuntime = __cachedModules["react-refresh/cjs/react-refresh-runtime.development"];
const prevRefreshReg = globalThis.$RefreshReg$;
const prevRefreshSig = globalThis.$RefreshSig$ || (() => {
  console.info("no react refresh setup!")
  return (x) => x
});
globalThis.$RefreshReg$ = (type, id) => RefreshRuntime.register(type, "${id}" + " " + id);
globalThis.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;

${prefixCode}

module.url = '${id}'
module.hot = createHotContext(module.url)

${code}


if (module.hot) {
  globalThis.$RefreshReg$ = prevRefreshReg;
  globalThis.$RefreshSig$ = prevRefreshSig;
  globalThis['lastHmrExports'] = JSON.stringify(Object.keys(exports))
  if (module.hot.accept) {
    module.hot.accept((nextExports) => {
      RefreshRuntime.performReactRefresh()
    });
  }
}
  `;
}
export const transformCommonJs = async (id, code) => {
    const parser = getParser(id);
    if (!parser)
        return;
    return await transform(code, {
        filename: id,
        swcrc: false,
        configFile: false,
        module: {
            type: 'commonjs',
        },
        sourceMaps: shouldSourceMap(),
        jsc: {
            target: 'es5',
            parser,
            transform: {
                useDefineForClassFields: true,
                react: {
                    development: true,
                    runtime: 'automatic',
                },
            },
        },
    });
};
export const transformForBuild = async (id, code) => {
    const parser = getParser(id);
    if (!parser)
        return;
    return await transform(code, {
        filename: id,
        swcrc: false,
        configFile: false,
        sourceMaps: shouldSourceMap(),
        jsc: {
            target: 'es2019',
            parser,
            transform: {
                useDefineForClassFields: true,
                react: {
                    development: true,
                    runtime: 'automatic',
                },
            },
        },
    });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBTUwsU0FBUyxHQUNWLE1BQU0sV0FBVyxDQUFBO0FBQ2xCLE9BQU8sRUFBeUIsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFFbkMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFFdEQsMEJBQTBCO0FBRTFCLDJFQUEyRTtBQUMzRSxTQUFTLGVBQWU7SUFDdEIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixLQUFLLEdBQUcsQ0FBQTtBQUNuRCxDQUFDO0FBRUQscUZBQXFGO0FBQ3JGLE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FDM0IsT0FBTyxVQUFVLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUNqRSxDQUFDLE9BQU8sQ0FBQTtBQUNULE1BQU0sZ0JBQWdCLEdBQUcsMEJBQTBCLENBQUE7QUEyQm5ELE1BQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQTtBQUVqRSxNQUFNLE9BQU8sR0FBaUM7SUFDNUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUU7SUFDN0QsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUU7SUFDN0QsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFO0lBQzNDLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUU7SUFDL0Is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