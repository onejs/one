// SSG page inside a route group layout
// Tests that hydration doesn't cause visible flicker/delay
// This page is intentionally heavy (4000+ characters) to match takeout3's homepage
export default function DelayTestPage() {
  return (
    <div id="delay-test-root" data-testid="delay-test-content">
      <h1>Hydration Delay Test</h1>
      <p id="delay-test-marker">
        This content should hydrate without a visible delay. If there is a gap between the
        SSG content being removed and re-added, users will see a flash of empty content.
      </p>
      <div id="delay-test-payload">
        {/* Heavy content payload to match takeout3's ~4500 character homepage */}
        <section>
          <h2>Ship apps everywhere</h2>
          <p>
            A modern and incredibly robust starting point for building apps that run on
            every platform. From native mobile to desktop, from web apps to server-side
            rendering. Build once, deploy anywhere with confidence.
          </p>
          <p>
            This framework provides an elegant solution to the age-old problem of
            cross-platform development. No more maintaining separate codebases for iOS,
            Android, and web.
          </p>
        </section>
        <section>
          <h2>Features that matter</h2>
          <ul>
            <li>Universal rendering across all platforms with a single codebase</li>
            <li>Built-in routing with file-system based conventions</li>
            <li>Server-side rendering and static site generation</li>
            <li>Type-safe navigation with automatic parameter validation</li>
            <li>Optimized for performance with code splitting and lazy loading</li>
            <li>Full support for React Native and web simultaneously</li>
            <li>Advanced theming and styling with CSS-in-JS support</li>
            <li>Developer experience focused with hot module replacement</li>
          </ul>
        </section>
        <section>
          <h2>Getting started</h2>
          <p>
            Getting started is as simple as running a single command. Our CLI will guide
            you through the setup process and get you up and running in minutes. Choose
            your template, configure your options, and start building immediately.
          </p>
          <pre>bunx create-takeout@latest my-app</pre>
          <p>
            Creating new Takeout app... Generating project files... Installing
            dependencies... Setting up development environment... Your app is ready to go!
          </p>
        </section>
        <section>
          <h2>Why choose us</h2>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
            nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore
            eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt
            in culpa qui officia deserunt mollit anim id est laborum.
          </p>
          <p>
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium
            doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore
            veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim
            ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
            consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
          </p>
          <p>
            Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur,
            adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et
            dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis
            nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex
            ea commodi consequatur.
          </p>
        </section>
      </div>
    </div>
  )
}
