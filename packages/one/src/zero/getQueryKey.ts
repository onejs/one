import { hashString } from "../utils/hashString";

export function getQueryKey(query: { ast: any }): string {
  return hashString(JSON.stringify(query.ast));
}
