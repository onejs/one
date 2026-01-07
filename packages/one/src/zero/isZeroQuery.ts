// TODO more legit
export function isZeroQuery(obj: any): boolean {
  if (!obj) return false;
  if (typeof obj !== "object") return false;
  if (!obj.ast || !obj.ast.table) return false;
  return true;
}
