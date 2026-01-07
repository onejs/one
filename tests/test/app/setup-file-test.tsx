import { useState, useEffect } from "react";
import { Text, View } from "react-native";

declare global {
  var __setupFileRan: {
    client?: boolean;
    server?: boolean;
    native?: boolean;
  };
}

export default function SetupFileTest() {
  // Use state and effect to re-read after hydration
  const [setupStatus, setSetupStatus] = useState(() => globalThis.__setupFileRan || {});

  useEffect(() => {
    // Re-read the global after component mounts (client-side)
    setSetupStatus({ ...globalThis.__setupFileRan });
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 20 }}>
      <Text testID="setup-file-status" accessibilityLabel="setup-file-status">
        {JSON.stringify(setupStatus)}
      </Text>
      <Text testID="client-setup-ran" accessibilityLabel="client-setup-ran">
        client: {setupStatus.client ? "true" : "false"}
      </Text>
      <Text testID="server-setup-ran" accessibilityLabel="server-setup-ran">
        server: {setupStatus.server ? "true" : "false"}
      </Text>
      <Text testID="native-setup-ran" accessibilityLabel="native-setup-ran">
        native: {setupStatus.native ? "true" : "false"}
      </Text>
    </View>
  );
}
