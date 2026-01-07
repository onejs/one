import type { PathConfigMap } from "@react-navigation/core";
import { describe, expect, it } from "vitest";

import { getPathFromState, type State } from "./getPathFromState";

describe("hash support", () => {
  it("appends hash to the path", () => {
    const state = {
      index: 0,
      key: "key",
      routes: [
        {
          name: "index",
          path: "/",
          params: {
            "#": "hash1",
          },
        },
      ],
      stale: true,
      type: "stack",
    };

    const config = {
      screens: {
        index: "",
        _sitemap: "_sitemap",
      },
    };

    expect(getPathFromState(state, config)).toBe("/#hash1");
  });

  it("works with nested state, existing router and path params", () => {
    const state = {
      index: 1,
      key: "key",
      routeNames: ["index", "[test]", "_sitemap", "+not-found"],
      routes: [
        {
          key: "key",
          name: "index",
          params: undefined,
          path: "/",
        },
        {
          key: "key",
          name: "[test]",
          params: {
            test: "hello-world",
            query: "true",
            "#": "a",
          },
          path: undefined,
        },
      ],
      stale: false,
      type: "stack",
    };

    const config = {
      screens: {
        "[test]": ":test",
        index: "",
        _sitemap: "_sitemap",
      },
    };

    expect(getPathFromState(state, config)).toBe("/hello-world?query=true#a");
  });
});

// TODO
it.skip(`handles url search params params`, () => {
  const state = {
    routes: [
      {
        name: "index",
        params: {
          test: "true",
          hello: "world",
          array: ["1", "2"],
        },
        path: "/?test=true&hello=world&array=1&array=2",
      },
    ],
  };

  const config = {
    screens: {
      index: "",
      _sitemap: "_sitemap",
    },
  };

  expect(getPathFromState(state, config)).toBe("/?test=true&hello=world&array=1&array=2");
});

it(`handles uninitialized state on nested navigation with route params`, () => {
  const config = {
    screens: {
      index: "",
      "[folderSlugL1]": {
        path: ":folderSlugL1",
        screens: {
          "[folderSlugL2]": {
            path: ":folderSlugL2",
            screens: {
              "[folderSlugL3]": {
                path: ":folderSlugL3",
                screens: {
                  page: "page",
                },
              },
            },
          },
        },
      },
    },
  } satisfies { screens: PathConfigMap<any> };

  const state = {
    routes: [
      {
        name: "[folderSlugL1]",
        params: {
          folderSlugL1: "foo",
          screen: "[folderSlugL2]",
          params: {
            folderSlugL1: "foo",
            folderSlugL2: "bar",
            screen: "[folderSlugL3]",
            params: {
              folderSlugL1: "foo",
              folderSlugL2: "bar",
              folderSlugL3: "baz",
              screen: "page",
            },
          },
        },
      },
    ],
  } satisfies State;

  expect(getPathFromState(state, config)).toBe("/foo/bar/baz/page");
});
