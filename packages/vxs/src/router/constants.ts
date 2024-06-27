export const CLIENT_BASE_URL =
  typeof window !== 'undefined' && window.location
    ? `${window.location.protocol}//${window.location.host}`
    : ``

// for example we have loaders like _vxrn_loader.js safari caches things
// aggressively so we want to have a search params that clears that cache
// uniquely across deploys this will be unique per-deploy nicely:
export const CACHE_KEY = `${Math.random()}`.slice(3)
