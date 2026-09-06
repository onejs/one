// fixture for the nativeTransformModules test: the shape a user's own native
// transform takes now that there is no babel to host a plugin.
const path = require('node:path')

module.exports = function exampleNativeTransform(code, ctx) {
  // ctx.filename is absolute. metro's own name for the file is relative to the
  // project root, so a transform matching on paths (an include list, a
  // node_modules skip) would quietly decide the opposite of what the babel
  // plugin it replaced decided.
  if (!path.isAbsolute(ctx.filename)) {
    throw new Error(`[fixture] expected an absolute filename, got ${ctx.filename}`)
  }
  if (!code.includes('__EXAMPLE_BUILD_ID')) return null
  return code
    .replace(/__EXAMPLE_BUILD_ID/g, JSON.stringify(`${ctx.platform}-build`))
    .replace(/__EXAMPLE_FILENAME/g, JSON.stringify(ctx.filename))
}
