export declare function resolveResponse(
  getResponse: () => Promise<Response>
): Promise<Response>
export declare function resolveAPIEndpoint(
  runEndpoint: () => Promise<any>,
  request: Request,
  params: Record<string, string>
): Promise<Response>
//# sourceMappingURL=resolveResponse.d.ts.map
