import { Suspense, useState } from "react";
import { useLoader, useLoaderState } from "one";
import { Button, Text, YStack } from "tamagui";

export function loader() {
  const timestamp = Date.now();
  console.log("[Test Loader] Executed at:", timestamp);
  return { timestamp };
}

function LoaderContent() {
  const { data, refetch, state } = useLoaderState(loader);
  const [initialTimestamp] = useState(data.timestamp);

  return (
    <YStack gap="$4" p="$4">
      <Text id="timestamp">{data.timestamp}</Text>
      <Text id="state">{state}</Text>
      <Text id="changed">{data.timestamp !== initialTimestamp ? "YES" : "NO"}</Text>
      <Button id="refetch" onPress={refetch}>
        {state === "loading" ? "Loading..." : "Refetch"}
      </Button>
    </YStack>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Text>Loading...</Text>}>
      <LoaderContent />
    </Suspense>
  );
}
