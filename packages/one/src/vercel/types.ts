export type PageConfig = {
  strategy: "ssr" | "static" | "prerender" | "edge";
};

export type PrerenderPageConfig = PageConfig & {
  strategy: "prerender";
  revalidate: number;
};
