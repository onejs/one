import { Link, useLoader } from "one";

export async function loader() {
	return {
		pageData: "follow-ssr-other",
		timestamp: Date.now(),
	};
}

export default function FollowSsrOther() {
	const data = useLoader(loader);

	return (
		<div id="follow-ssr-other">
			<h1>Other Follow SSR Page</h1>
			<p id="follow-ssr-other-data">{JSON.stringify(data)}</p>
			<Link href="/follow-ssr" id="link-back">
				Back to Index
			</Link>
		</div>
	);
}
