import type { LiveActivityState, PushTokenEvent, WidgetData } from './index.native';
import type { ReactNode } from 'react';
import type { ActivityView } from './view';
export { WidgetUI, type WidgetStyle, type ActivityView } from './view';
export type { LiveActivityState, PushTokenEvent, WidgetData };
export declare const Widgets: Readonly<{
    write(_data: WidgetData): Promise<void>;
    writeView(_view: ReactNode): Promise<void>;
}>;
export declare const LiveActivities: Readonly<{
    start(_title: string, _state: LiveActivityState, _push?: boolean): Promise<string>;
    startView(_title: string, _view: ActivityView, _push?: boolean): Promise<string>;
    update(_id: string, _state: LiveActivityState): Promise<void>;
    updateView(_id: string, _view: ActivityView): Promise<void>;
    end(_id: string): Promise<void>;
    pushToken(_id: string): Promise<string | null>;
    onPushToken(_listener: (event: PushTokenEvent) => void): () => void;
}>;
//# sourceMappingURL=index.d.ts.map