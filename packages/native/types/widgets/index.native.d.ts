import type { ReactNode } from 'react';
import { type ActivityView } from './view';
export { WidgetUI, type WidgetStyle, type ActivityView } from './view';
export type WidgetData = {
    title: string;
    value: string;
    subtitle: string;
};
export type LiveActivityState = {
    status: string;
    value: string;
};
export type PushTokenEvent = {
    id: string;
    token: string;
};
export declare const Widgets: Readonly<{
    write(data: WidgetData): Promise<void>;
    writeView(view: ReactNode): Promise<void>;
}>;
export declare const LiveActivities: Readonly<{
    start(title: string, state: LiveActivityState, push?: boolean): Promise<string>;
    startView(title: string, view: ActivityView, push?: boolean): Promise<string>;
    update(id: string, state: LiveActivityState): Promise<void>;
    updateView(id: string, view: ActivityView): Promise<void>;
    end(id: string): Promise<void>;
    pushToken(id: string): Promise<string | null>;
    onPushToken(listener: (event: PushTokenEvent) => void): () => void;
}>;
//# sourceMappingURL=index.native.d.ts.map