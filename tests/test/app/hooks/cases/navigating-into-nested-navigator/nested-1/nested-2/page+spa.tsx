// Need to use SPA for this file because we are testing the client-side JS router.
// SSR can cause false positives if the test runs before the client-side JS is ready,
// resulting in a full page load instead of SPA-style navigation.

import { Link, usePathname } from "one";
import { useRef } from "react";
import { View, Text } from "react-native";

export default function Index() {
  const pathname = usePathname();
  const pathNameOnFirstRender = useRef(pathname).current;

  return (
    <View style={{ backgroundColor: "white" }}>
      <Text style={{ color: "black" }}>
        Pathname: <Text testID="pathname">{pathname}</Text>
      </Text>
      <Text style={{ color: "black" }}>
        Pathname on first render:{" "}
        <Text testID="pathname-on-first-render">{pathNameOnFirstRender}</Text>
      </Text>
      <Link testID="back-to-index" href="/hooks/cases/navigating-into-nested-navigator">
        Back to index
      </Link>
    </View>
  );
}
