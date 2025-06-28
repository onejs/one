/**
 * Patches a ExpoGoManifestHandlerMiddleware instance in-place to use a custom main module name.
 */
export function patchExpoGoManifestHandlerMiddlewareWithCustomMainModuleName(
  manifestHandlerMiddleware: any,
  mainModuleName: string
) {
  // (`ExpoGoManifestHandlerMiddleware` extends `ManifestMiddleware`)
  //
  // `ExpoGoManifestHandlerMiddleware._getManifestResponseAsync`
  //   (`bundleUrl` is used as `launchAsset.url`)
  //   ↑ `bundleUrl`
  // `ManifestMiddleware._resolveProjectSettingsAsync`
  //   ↑ `mainModuleName`
  // `ManifestMiddleware.resolveMainModuleName`
  const origResolveMainModuleName =
    manifestHandlerMiddleware.resolveMainModuleName.bind(manifestHandlerMiddleware)
  manifestHandlerMiddleware.resolveMainModuleName = (props) => {
    return origResolveMainModuleName({
      ...props,
      pkg: {
        ...props.pkg,
        main: mainModuleName,
      },
    })
  }
}
