import type { RedirectStatusCode } from "hono/utils/http-status";

export function isStatusRedirect(status: number): status is RedirectStatusCode {
  return status > 300 && status < 309;
}
