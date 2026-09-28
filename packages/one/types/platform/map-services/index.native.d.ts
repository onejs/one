import type { MapCoordinate, MapPlace, MapRoute, MapSuggestion, MapTransport } from '../specs/OneMapServices.nitro';
export type { MapCoordinate, MapPlace, MapRoute, MapRouteStep, MapSuggestion, MapTransport } from '../specs/OneMapServices.nitro';
declare function search(query: string, center: MapCoordinate, radiusMeters?: number): Promise<MapPlace[]>;
declare function autocomplete(query: string, center: MapCoordinate, radiusMeters?: number): Promise<MapSuggestion[]>;
declare function resolveSuggestion(id: string): Promise<MapPlace>;
declare function directions(origin: MapCoordinate, destination: MapCoordinate, transport?: MapTransport): Promise<MapRoute>;
export declare const MapServices: Readonly<{
    search: typeof search;
    autocomplete: typeof autocomplete;
    resolveSuggestion: typeof resolveSuggestion;
    directions: typeof directions;
}>;
//# sourceMappingURL=index.native.d.ts.map