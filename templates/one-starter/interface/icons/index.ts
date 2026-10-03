// web and android draw the shared set. ios overrides part of it in
// index.ios.ts, which is why the set lives in base.ts: platform resolution
// would send `./index` from inside index.ios.ts back to itself.
export { Icons, type AppIconName } from './base'
