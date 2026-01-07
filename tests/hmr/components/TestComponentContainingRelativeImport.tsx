import { Text } from "react-native";
import { useSomething } from "../other/hooks";

const text = "Some text in TestComponentContainingRelativeImport";

export function TestComponentContainingRelativeImport() {
  const hookReturnValue = useSomething();
  return (
    <>
      <Text testID="TestComponentContainingRelativeImport-text-content">{text}</Text>
      <Text testID="relative-imported-hook-value">{hookReturnValue}</Text>
    </>
  );
}
