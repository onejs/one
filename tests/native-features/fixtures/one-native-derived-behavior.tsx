import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { One } from "one";

type Example =
	| "image"
	| "location"
	| "shortcuts"
	| "product"
	| "store"
	| "subscriptions";
const productID = "dev.vxrn.native.tests.purchases.unlock";
const monthlyID = "dev.vxrn.native.tests.derived.monthly";
const groupID = "one-native-derived-subscriptions";

export default function OneNativeDerivedBehavior() {
	const [example, setExample] = useState<Example>("image");
	const [imageURL, setImageURL] = useState("");
	const [imageScale, setImageScale] = useState(1);
	const [imageIdentity, setImageIdentity] = useState(0);
	const [locationActions, setLocationActions] = useState(0);
	const [shortcutActions, setShortcutActions] = useState(0);
	const [locationDisabled, setLocationDisabled] = useState(false);
	const [checkpoints, setCheckpoints] = useState(0);
	const [missing, setMissing] = useState(false);
	const [byGroup, setByGroup] = useState(false);
	const image = Image.resolveAssetSource(
		require("../assets/derived-image.jpg"),
	);
	if (!image) throw new Error("derived image asset could not be resolved");

	return (
		<View style={styles.screen} testID="derived-behavior-screen">
			<View style={styles.choices}>
				{(
					[
						"image",
						"location",
						"shortcuts",
						"product",
						"store",
						"subscriptions",
					] as const
				).map((name) => (
					<Pressable
						key={name}
						testID={`derived-example-${name}`}
						style={styles.chip}
						onPress={() => {
							setExample(name);
							setMissing(false);
						}}
					>
						<Text>{name}</Text>
					</Pressable>
				))}
			</View>
			<Pressable
				testID="derived-reset"
				style={styles.chip}
				onPress={() => {
					setExample("image");
					setImageURL("");
					setImageScale(1);
					setImageIdentity(0);
					setLocationActions(0);
					setShortcutActions(0);
					setLocationDisabled(false);
					setCheckpoints(0);
					setMissing(false);
					setByGroup(false);
				}}
			>
				<Text>Reset example</Text>
			</Pressable>
			{example === "image" ||
			example === "location" ||
			example === "shortcuts" ? (
				<>
					<Text testID="derived-location-actions">{`Location actions: ${locationActions}`}</Text>
					<Text testID="derived-shortcut-actions">{`Shortcuts actions: ${shortcutActions}`}</Text>
					<Text testID="derived-checkpoints">{`Checkpoints: ${checkpoints}`}</Text>
					<Pressable
						testID="derived-checkpoint"
						style={styles.chip}
						onPress={() => setCheckpoints((count) => count + 1)}
					>
						<Text>Checkpoint</Text>
					</Pressable>
				</>
			) : null}
			{example === "image" ? (
				<>
					<Text testID="derived-image-scale-value">{`Image scale: ${imageScale}`}</Text>
					<Text testID="derived-image-identity">{`Image identity: ${imageIdentity}`}</Text>
					<Text testID="derived-image-url">{`Image URL: ${imageURL ? "loaded" : "nil"}`}</Text>
					<One.iOS.AsyncImage
						key={imageIdentity}
						url={imageURL}
						scale={imageScale}
						style={styles.image}
						testID="derived-image"
					/>
					<View style={styles.choices}>
						<Pressable
							testID="derived-image-load"
							style={styles.chip}
							onPress={() => {
								setImageScale(1);
								setImageURL(image.uri);
							}}
						>
							<Text>Load image</Text>
						</Pressable>
						<Pressable
							testID="derived-image-scale"
							style={styles.chip}
							onPress={() => setImageScale(2)}
						>
							<Text>Scale image</Text>
						</Pressable>
						<Pressable
							testID="derived-image-recreate"
							style={styles.chip}
							onPress={() => setImageIdentity((value) => value + 1)}
						>
							<Text>New image identity</Text>
						</Pressable>
						<Pressable
							testID="derived-image-clear"
							style={styles.chip}
							onPress={() => setImageURL("")}
						>
							<Text>Clear image</Text>
						</Pressable>
					</View>
				</>
			) : example === "location" ? (
				<>
					<Text testID="derived-location-disabled">{`Location disabled: ${locationDisabled}`}</Text>
					<One.iOS.LocationButton
						title="shareCurrentLocation"
						onAction={() => setLocationActions((count) => count + 1)}
						swiftStyle={{ disabled: locationDisabled }}
						testID="derived-location"
					/>
					<Pressable
						testID="derived-location-disable"
						style={styles.chip}
						onPress={() => setLocationDisabled(true)}
					>
						<Text>Disable location</Text>
					</Pressable>
				</>
			) : example === "shortcuts" ? (
				<One.iOS.ShortcutsLink
					onAction={() => setShortcutActions((count) => count + 1)}
					testID="derived-shortcuts"
				/>
			) : (
				<>
					<Pressable
						testID="derived-store-missing"
						style={styles.chip}
						onPress={() => setMissing(true)}
					>
						<Text>Missing product</Text>
					</Pressable>
					{example === "product" ? (
						<One.iOS.ProductView
							id={missing ? "one.native.missing.product" : productID}
							style={styles.store}
							testID="derived-product"
						/>
					) : example === "store" ? (
						<One.iOS.StoreView
							ids={missing ? ["one.native.missing.product"] : [productID]}
							style={styles.store}
							testID="derived-store"
						/>
					) : (
						<>
							<Pressable
								testID="derived-subscriptions-group"
								style={styles.chip}
								onPress={() => setByGroup((value) => !value)}
							>
								<Text>{byGroup ? "Use product IDs" : "Use group ID"}</Text>
							</Pressable>
							<Text testID="derived-subscriptions-constructor">
								{byGroup ? "Constructor: groupID" : "Constructor: productIDs"}
							</Text>
							<One.iOS.SubscriptionStoreView
								{...(byGroup
									? { groupID: missing ? "one.native.missing.group" : groupID }
									: {
											productIDs: missing
												? ["one.native.missing.subscription"]
												: [monthlyID],
										})}
								style={styles.store}
								testID="derived-subscriptions"
							/>
						</>
					)}
				</>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, padding: 16, gap: 12, backgroundColor: "#fff" },
	choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	chip: {
		padding: 10,
		borderRadius: 8,
		backgroundColor: "#eee",
		alignSelf: "flex-start",
	},
	image: { width: 96, height: 64 },
	store: { height: 420 },
});
