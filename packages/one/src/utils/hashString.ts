import xxh from "xxhashjs";

export function hashString(str: string): string {
  return xxh.h64(0).update(str).digest().toString(36);
}
