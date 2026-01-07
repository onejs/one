import { Suspense, useState, useEffect } from "react";
import { useLoader, useLoaderState } from "one";
import { Button, Text, YStack } from "tamagui";

export function loader() {
  const timestamp = Date.now();
  const random = Math.random();
  console.log("[Shared Cache Loader] Called at:", timestamp, "Random:", random);
  return {
    timestamp,
    random,
  };
}

function UseLoaderComponent() {
  const data = useLoader(loader);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <YStack>
      <Text id="useloader-timestamp">
        useLoader: {isClient && data ? data.timestamp : "loading"}
      </Text>
      <Text id="useloader-random">useLoader: {isClient && data ? data.random : "loading"}</Text>
    </YStack>
  );
}

function UseLoaderStateComponent() {
  const { data, refetch, state } = useLoaderState(loader);
  const [refetchCount, setRefetchCount] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleRefetch = async () => {
    setRefetchCount((c) => c + 1);
    await refetch();
  };

  return (
    <YStack>
      <Text id="useloaderstate-timestamp">
        useLoaderState: {isClient && data ? data.timestamp : "loading"}
      </Text>
      <Text id="useloaderstate-random">
        useLoaderState: {isClient && data ? data.random : "loading"}
      </Text>
      <Text id="refetch-count">Refetch count: {refetchCount}</Text>
      <Text id="state">State: {state}</Text>

      <Button id="refetch-btn" onPress={handleRefetch} disabled={state === "loading"}>
        {state === "loading" ? "Loading..." : "Refetch"}
      </Button>
    </YStack>
  );
}

function SharedCacheContent() {
  return (
    <YStack gap="$4" p="$4">
      <Text id="title">Shared Cache Test</Text>
      <UseLoaderComponent />
      <UseLoaderStateComponent />
    </YStack>
  );
}

export default () => {
  return (
    <Suspense fallback={<Text>Loading...</Text>}>
      <SharedCacheContent />
    </Suspense>
  );
};
