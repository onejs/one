// validates that API handlers receive worker-runtime context (env + executionCtx)
// from the cloudflare worker. under wrangler dev, env is the bindings object
// and executionCtx exposes waitUntil() / passThroughOnException().

export async function GET(_request: Request, { worker }: any) {
  const env = worker?.env
  const executionCtx = worker?.executionCtx

  if (executionCtx?.waitUntil) {
    // schedule a no-op background task — if the worker kills us after the
    // response is sent without awaiting, this still completes because
    // waitUntil extends the worker lifetime.
    executionCtx.waitUntil(Promise.resolve())
  }

  return Response.json({
    hasWorker: !!worker,
    hasEnv: env && typeof env === 'object',
    hasExecutionCtx: !!executionCtx,
    hasWaitUntil: typeof executionCtx?.waitUntil === 'function',
    hasPassThroughOnException: typeof executionCtx?.passThroughOnException === 'function',
    // ASSETS binding is injected by the framework's wrangler config
    hasAssetsBinding: !!env?.ASSETS,
  })
}
