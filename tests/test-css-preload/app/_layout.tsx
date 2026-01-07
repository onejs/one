import { Slot } from "one";

export default function Layout() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>CSS Preload Test</title>
      </head>
      <body>
        <Slot />
      </body>
    </html>
  );
}
