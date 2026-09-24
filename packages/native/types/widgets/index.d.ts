import type { LiveActivityState, PushTokenEvent, WidgetData } from './index.native';
export type { LiveActivityState, PushTokenEvent, WidgetData };
export declare const Widgets: Readonly<{
    write(_data: WidgetData): Promise<void>;
}>;
export declare const LiveActivities: Readonly<{
    start(_title: string, _state: LiveActivityState, _push?: boolean): Promise<string>;
    update(_id: string, _state: LiveActivityState): Promise<void>;
    end(_id: string): Promise<void>;
    pushToken(_id: string): Promise<string | null>;
    onPushToken(_listener: (event: PushTokenEvent) => void): () => void;
}>;
//# sourceMappingURL=index.d.ts.map