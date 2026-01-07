import type { OneRouter } from '../interfaces/router'
export declare const redirect: (
  path: '__branded__' extends keyof OneRouter.Href ? string : OneRouter.Href,
  status?: number
) => Response | undefined
//# sourceMappingURL=redirect.d.ts.map
