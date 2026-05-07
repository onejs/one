import type { RedirectStatusCode } from 'hono/utils/http-status';
export type LocationRedirectStatusCode = Extract<RedirectStatusCode, 301 | 302 | 303 | 307 | 308>;
export declare function isStatusRedirect(status: number): status is LocationRedirectStatusCode;
//# sourceMappingURL=isStatus.d.ts.map