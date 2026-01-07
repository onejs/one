// for some reason instanceof isnt working reliably
export function isResponse(res: any): res is Response {
  return (
    res instanceof Response ||
    (typeof res.status === "number" && "body" in res && typeof res.ok === "boolean")
  );
}
