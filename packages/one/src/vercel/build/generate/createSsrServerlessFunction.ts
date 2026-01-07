import { join, resolve } from "node:path";
import fs from "fs-extra";
import type { One, RouteInfo } from "../../../vite/types";
import { serverlessVercelNodeJsConfig } from "../config/vc-config-base";
import { serverlessVercelPackageJson } from "../config/vc-package-base";
import { getPathFromRoute } from "../getPathFromRoute";

// Documentation - Vercel Build Output v3
// https://vercel.com/docs/build-output-api/v3#build-output-api-v3
export async function createSsrServerlessFunction(
  route: RouteInfo<string>,
  buildInfo: One.BuildInfo,
  oneOptionsRoot: string,
  postBuildLogs: string[],
) {
  try {
    const path = getPathFromRoute(route, { includeIndex: true });
    postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] path: ${path}`);

    const buildInfoAsString = JSON.stringify(buildInfo);
    const funcFolder = resolve(join(oneOptionsRoot, `.vercel/output/functions/${path}.func`));
    await fs.ensureDir(funcFolder);

    const distServerFrom = resolve(join(oneOptionsRoot, "dist", "server"));
    const distServerTo = resolve(join(funcFolder, "server"));
    await fs.ensureDir(distServerTo);
    postBuildLogs.push(
      `[one.build][vercel.createSsrServerlessFunction] copy server dist files from ${distServerFrom} to ${distServerTo}`,
    );
    await fs.copy(distServerFrom, distServerTo);

    postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] writing buildInfo.json`);
    await fs.writeFile(join(funcFolder, "buildInfo.js"), `export default ${buildInfoAsString}`);

    await fs.ensureDir(join(funcFolder, "entrypoint"));
    const entrypointFilePath = resolve(join(funcFolder, "entrypoint", "index.js"));
    postBuildLogs.push(
      `[one.build][vercel.createSsrServerlessFunction] writing entrypoint to ${entrypointFilePath}`,
    );
    await fs.writeFile(
      entrypointFilePath,
      `
  const buildInfoConfig = await import('../buildInfo.js');
  const entry = await import('../server/_virtual_one-entry.js');
  const routeFile = ${JSON.stringify(route.file)}

  const handler = async (req, res) => {
    // console.debug("req.url", req.url);
    const url = new URL(req.url, \`https://\${process.env.VERCEL_URL}\`);

    // Check if this is a loader request (routed here by config.json rewrite)
    const isLoaderRequest = url.searchParams.get('__loader') === '1';

    // Extract route params - from URL path match OR from query params (for loader requests)
    const routePattern = ${JSON.stringify(route.page)};
    const paramNames = [];
    const regexPattern = routePattern
      .replace(/\\[\\.\\.\\.(\\w+)\\]/g, (_, name) => { paramNames.push({ name, catch: true }); return '(.+)'; })
      .replace(/\\[(\\w+)\\]/g, (_, name) => { paramNames.push({ name, catch: false }); return '([^/]+)'; });

    const routeParams = {};

    // First try to get params from query string (set by Vercel rewrite rules)
    // This handles both loader requests and regular page requests that went through rewrites
    for (const param of paramNames) {
      const value = url.searchParams.get(param.name);
      if (value) {
        routeParams[param.name] = param.catch ? value.split('/') : value;
      }
    }

    // If no params found in query string, try extracting from URL path
    if (Object.keys(routeParams).length === 0) {
      const match = url.pathname.match(new RegExp(\`^\${regexPattern}$\`));
      if (match) {
        paramNames.forEach((param, index) => {
          const value = match[index + 1];
          routeParams[param.name] = param.catch ? value.split('/') : value;
        });
      }
    }

    // Create a proper Request object for SSR loaders
    const request = new Request(url.toString(), {
      method: req.method || 'GET',
      headers: new Headers(req.headers || {}),
    });

    // Reconstruct the original path by replacing :param placeholders with actual values
    // The pathname might be the rewritten path (e.g., /dynamic/:id instead of /dynamic/123)
    let originalPath = url.pathname;
    for (const [key, value] of Object.entries(routeParams)) {
      originalPath = originalPath.replace(\`:$\{key}\`, String(value));
    }

    const loaderProps = {
      path: originalPath,
      params: routeParams,
      request,
    }

    const postfix = url.pathname.endsWith('/') ? 'index.tsx' : '+ssr.tsx';
    // const routeFile = \`.\${url.pathname}\${postfix}\`;
    let route = buildInfoConfig.default.routeToBuildInfo[routeFile];

    // If we cannot find the route by direct match, try to find it by looking it up in the
    // pathToRoute mapping. Currently this handles cases such as "(some-group)/index.tsx",
    // "index.web.tsx".
    if (!route) {
      const routeName = buildInfoConfig.default.pathToRoute[url.pathname];
      route = buildInfoConfig.default.routeToBuildInfo[routeName];
    }

    const exported = await import(route.serverJsPath.replace('dist/','../'))
    const loaderData = await exported.loader?.(loaderProps)

    // For loader requests, return the loader data as a JavaScript module
    if (isLoaderRequest) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end(\`export function loader() { return \${JSON.stringify(loaderData)} }\`)
      return
    }

    // For page requests, render the full HTML
    const render = entry.default.render;
    const preloads = route.preloads
    const css = route.css || []
    const rendered = await render({
      mode: route.type,
      loaderData,
      loaderProps,
      path: loaderProps?.path || '/',
      preloads,
      css,
    })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    // https://vercel.com/docs/deployments/skew-protection#supported-frameworks__
    if (process.env.VERCEL_SKEW_PROTECTION_ENABLED === '1') {
      res.setHeader('Set-Cookie', [
        \`__vdpl=\${process.env.VERCEL_DEPLOYMENT_ID}; HttpOnly\`,
      ]);
    }
    res.end(rendered)
  }

  export default handler;
  `,
    );

    const packageJsonFilePath = resolve(join(funcFolder, "package.json"));
    postBuildLogs.push(
      `[one.build][vercel.createSsrServerlessFunction] writing package.json to ${packageJsonFilePath}`,
    );
    await fs.writeJSON(packageJsonFilePath, serverlessVercelPackageJson);

    // Documentation - Vercel Build Output v3 Node.js Config
    //   https://vercel.com/docs/build-output-api/v3/primitives#node.js-config
    const vcConfigFilePath = resolve(join(funcFolder, ".vc-config.json"));
    postBuildLogs.push(
      `[one.build][vercel.createSsrServerlessFunction] writing .vc-config.json to ${vcConfigFilePath}`,
    );
    return fs.writeJson(vcConfigFilePath, {
      ...serverlessVercelNodeJsConfig,
      handler: "entrypoint/index.js",
      environment: {
        ...serverlessVercelNodeJsConfig.environment,
        ONE_DEFAULT_RENDER_MODE: "ssr",
      },
    });
  } catch (e) {
    console.error(
      `[one.build][vercel.createSsrServerlessFunction] failed to generate func for ${route.file}`,
      e,
    );
  }
}
