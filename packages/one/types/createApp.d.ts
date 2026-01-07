import "./setup";
import type { RenderAppProps } from "./types";
import type { One } from "./vite/types";
export type CreateAppProps = {
  routes: Record<string, () => Promise<unknown>>;
  routerRoot: string;
  flags?: One.Flags;
};
export declare function createApp(options: CreateAppProps):
  | Promise<void>
  | {
      options: CreateAppProps;
      render: (props: RenderAppProps) => Promise<string>;
    };
//# sourceMappingURL=createApp.d.ts.map
