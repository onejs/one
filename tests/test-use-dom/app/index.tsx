import { Text, View } from "react-native";
import { DomComponent } from "~/src/DomComponent";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        alignSelf: "center",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100%",
      }}
    >
      <Text>Hello world, from One</Text>

      <DomComponent />
    </View>
  );
}
