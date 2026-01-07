import { useParams } from "one";
import { Text, View } from "tamagui";

export default function ParamSSR() {
  return (
    <View
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
      gap={16}
    >
      <Text>Param SSR</Text>
      <Text id="param">{JSON.stringify(useParams())}</Text>
    </View>
  );
}
