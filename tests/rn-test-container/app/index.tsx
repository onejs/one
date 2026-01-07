import React from "react";
import { View, Text } from "react-native";

export default function Page() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text testID="hello-word">Hello One!</Text>
    </View>
  );
}
