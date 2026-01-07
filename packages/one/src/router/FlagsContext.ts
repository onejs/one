import { createContext } from "react";
import type { One } from "../vite/types";

export const FlagsContext = createContext<One.Flags>({});
