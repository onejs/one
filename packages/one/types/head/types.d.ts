import type { ReactNode } from "react";
import type { HeadModule } from "./HeadModule";
export type HeadType = React.FC<{
  children?: ReactNode;
}> &
  typeof HeadModule;
//# sourceMappingURL=types.d.ts.map
