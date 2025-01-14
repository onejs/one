import { defineConfig } from 'vite'
import { one } from 'one/vite'
import {cssToReactNativeRuntime} from 'react-native-css-interop/css-to-rn'

export default defineConfig({
  plugins: [
    {
      name: "nativewind:pre",
      enforce: 'pre',
      buildStart() {
        process.env.NATIVEWIND_OS = ["android", "ios"].includes(this.environment.name) ? "native" : "web"
      }  
    },
    one({
      native: {css: true},
      web: {defaultRenderMode: 'spa'},
    }),
    {
      name: "nativewind:css",
      transform(code, id) {
        if(["android", "ios"].includes(this.environment.name) && id.endsWith(".css")) {
          const data = JSON.stringify(cssToReactNativeRuntime(code, { inlineRem: 16 }))
          return { code:`require("nativewind").StyleSheet.registerCompiled(${data});`, map: null }
        }
      }
    },
  ],
})
