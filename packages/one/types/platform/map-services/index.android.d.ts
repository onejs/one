export type { MapCoordinate, MapPlace, MapRoute, MapRouteStep, MapSuggestion, MapTransport, } from '../specs/OneMapServices.nitro';
export declare const MapServices: Readonly<{
    search: (query: string, center: import("./unavailable").MapCoordinate, radiusMeters?: number) => Promise<import("./unavailable").MapPlace[]>;
    autocomplete: (_query: string, _center: import("./unavailable").MapCoordinate, _radiusMeters?: number) => Promise<import("./unavailable").MapSuggestion[]>;
    resolveSuggestion: (_id: string) => Promise<import("./unavailable").MapPlace>;
    directions: (_origin: import("./unavailable").MapCoordinate, _destination: import("./unavailable").MapCoordinate, _transport?: import("./unavailable").MapTransport) => Promise<import("./unavailable").MapRoute>;
}>;
//# sourceMappingURL=index.android.d.ts.map