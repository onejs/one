import './setup'

import { Root } from './Root'
import { resolveClientLoader } from './clientLoaderResolver'
import { render } from './render'
import { renderToString } from './server-render'
import type { RenderAppProps } from './types'

export type CreateAppProps = { routes: Record<string, () => Promise<unknown>> }

export function createApp(options: CreateAppProps) {
  if (import.meta.env.SSR) {
    return {
      options,
      render: async (props: RenderAppProps) => {
        let html = await renderToString(<Root routes={options.routes} {...props} />, {
          preloads: props.preloads,
        })

        // now we can grab and serialize in our zero queries
        const serverData = globalThis['__vxrnServerData__']
        if (serverData) {
          const hasQueryData = Object.keys(serverData).length
          if (hasQueryData) {
            html = html.replace(`{ __vxrn__: 'post-render' }`, JSON.stringify(serverData))
          }
        }

        //         // adds support for modulepreload scripts to browsers that dont support (safari and ff)
        //         // https://guybedford.com/es-module-preloading-integrity#modulepreload-polyfill
        //         html = html.replace(
        //           '</body>',
        //           `<script>
        // const h="modulepreload",E=function(i){return"/"+i},a={},y=function(u,s,v){let c=Promise.resolve();if(s&&s.length>0){document.getElementsByTagName("link");const e=document.querySelector("meta[property=csp-nonce]"),t=(e==null?void 0:e.nonce)||(e==null?void 0:e.getAttribute("nonce"));c=Promise.allSettled(s.map(r=>{if(r=E(r),r in a)return;a[r]=!0;const o=r.endsWith(".css"),d=o?'[rel="stylesheet"]':"";if(document.querySelector('link[href="' + r + '"]' + d))return;const n=document.createElement("link");if(n.rel=o?"stylesheet":h,o||(n.as="script"),n.crossOrigin="",n.href=r,t&&n.setAttribute("nonce",t),document.head.appendChild(n),o)return new Promise((f,m)=>{n.addEventListener("load",f),n.addEventListener("error",()=>m(new Error('Unable to preload CSS for ' + r)))})}))}function l(e){const t=new Event("vite:preloadError",{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return c.then(e=>{for(const t of e||[])t.status==="rejected"&&l(t.reason);return u().catch(l)})};
        // y()
        // </script>` + '</body>'
        //         )

        return html
      },
    }
  }

  // run their root layout before calling resolveClientLoader so they can register hook
  const rootLayoutImport = options.routes['/app/_layout.tsx']?.()

  return rootLayoutImport
    .then(() => {
      resolveClientLoader({
        loaderData: globalThis['__vxrnLoaderData__'],
        loaderServerData: globalThis['__vxrnLoaderServerData__'],
        loaderProps: globalThis['__vxrnLoaderProps__'],
      })
        .then(() => {
          // on client we just render
          render(<Root isClient routes={options.routes} path={window.location.href} />)
        })
        .catch((err) => {
          console.error(`Error running client loader resolver "onClientLoaderResolve":`, err)
        })
    })
    .catch((err) => {
      console.error(`Error importing root layout on client`, err)
    })
}
