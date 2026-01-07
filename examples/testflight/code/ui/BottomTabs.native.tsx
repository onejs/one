import { createNativeBottomTabNavigator } from "@bottom-tabs/react-navigation";
import { withLayoutContext } from "one";

export const NativeTabs = withLayoutContext(createNativeBottomTabNavigator().Navigator);
