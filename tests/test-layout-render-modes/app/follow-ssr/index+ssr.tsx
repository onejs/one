import { Link, useLoader, useMatches } from "one";

export async function loader() {
	return {
		pageData: "follow-ssr-page",
		timestamp: Date.now(),
		random: Math.random(),
	};
}

export default function FollowSsrPage() {
	const data = useLoader(loader);
	const matches = useMatches();

	return (
		<div id="follow-ssr-page">
			<h1>Follow SSR Page</h1>
			<p id="follow-ssr-page-data">{JSON.stringify(data)}</p>
			<p id="follow-ssr-page-matches">Matches: {matches.length}</p>
			<Link href="/follow-ssr/other" id="link-to-other">
				Go to Other
			</Link>
		</div>
	);
}
