const ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY = process.env.ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY;
if (!ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY) {
  throw new Error(
    "process.env.ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY is not set, make sure you have your one plugin configured correctly.",
  );
}

export const ctx = require.context(
  ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY,
  true,
  process.env.ONE_ROUTER_REQUIRE_CONTEXT_REGEX, // Should be replaced with a regex literal by Babel plugin, otherwise will get error like "Third argument of `require.context` should be an optional RegExp pattern matching all of the files to import, instead found node of type: LogicalExpression."
);
