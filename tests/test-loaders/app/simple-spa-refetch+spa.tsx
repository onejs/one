import { useLoaderState } from "one";
import { Button, Text, YStack } from "tamagui";

let spaCount = 0;

export function loader() {
  spaCount++;
  return {
    timestamp: Date.now(),
    count: spaCount,
  };
}

export default () => {
  const { data, refetch, state } = useLoaderState(loader);

  return (
    <YStack gap="$4" p="$4">
      <Text id="spa-timestamp">Timestamp: {data.timestamp}</Text>
      <Text id="spa-count">Count: {data.count}</Text>
      <Text id="spa-state">State: {state}</Text>

      <Button id="spa-refetch-btn" onPress={refetch} disabled={state === "loading"}>
        {state === "loading" ? "Loading..." : "Refetch"}
      </Button>
    </YStack>
  );
};
