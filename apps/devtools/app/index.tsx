import { Globe, Smartphone } from "@tamagui/lucide-icons";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { useEffect } from "react";
import { styled, Tabs, Text, View, XStack, YStack } from "tamagui";
import { AppTab } from "~/features/app/AppTab";
import { DataTab } from "~/features/data/DataTab";
import { RovingTabs } from "~/features/ui/RovingTabs";

export function HomePage() {
  // this is one way we could communicate between the node cli and the devtools
  useEffect(() => {
    try {
      onOpenUrl(([urlString]) => {
        const url = new URL(urlString);

        switch (url.host) {
          case "open-app": {
            const port = url.searchParams.get("port");
            console.warn("got message to open app port", port);

            break;
          }
        }
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <YStack data-tauri-drag-region f={1}>
      <RovingTabs
        initialTab="one"
        tabs={[
          { label: "Home", value: "one" },
          { label: "Data", value: "data" },
          { label: "App", value: "app" },
          { label: "Logs", value: "logs" },
          { label: "REPL", value: "repl" },
        ]}
      >
        <Tabs.Content f={1} data-tauri-drag-region value="one">
          <XStack data-tauri-drag-region p="$4" f={1} jc="center" gap="$4" fw="wrap">
            <ActionCard name="Open Web" Icon={Globe} />
            <ActionCard name="Open iOS" Icon={Smartphone} />
            <ActionCard name="Open Android" Icon={Smartphone} />

            <ActionCard name="Build Web" />
            <ActionCard name="Build iOS" />
            <ActionCard name="Build Android" />
          </XStack>
        </Tabs.Content>

        <Tabs.Content f={1} value="data">
          <DataTab />
        </Tabs.Content>

        <Tabs.Content f={1} value="app">
          <AppTab />
        </Tabs.Content>
      </RovingTabs>
    </YStack>
  );
}

const ActionCard = ({ name, Icon }: { name: string; Icon?: any }) => {
  return (
    <Card data-tauri-drag-region>
      {Icon && <Icon size={38} />}

      <Text userSelect="none" fontSize={18} ta="center" cur="inherit">
        {name}
      </Text>
    </Card>
  );
};

const Card = styled(View, {
  cur: "pointer",
  gap: "$4",
  ai: "center",
  jc: "center",
  w: "30%",
  f: 1,
  bg: "$background02",
  p: "$6",
  br: "$4",
  mih: 150,

  hoverStyle: {
    bg: "$color4",
  },
});
