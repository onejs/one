// fixture for the nativeTransformModules test: the shape a user's own native
// transform takes now that there is no babel to host a plugin.
module.exports = function exampleNativeTransform(code, ctx) {
  if (!code.includes('__EXAMPLE_BUILD_ID')) return null
  return code.replace(/__EXAMPLE_BUILD_ID/g, JSON.stringify(`${ctx.platform}-build`))
}
