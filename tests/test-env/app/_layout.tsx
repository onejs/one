import { Slot } from "one";

export default function Layout() {
  return (
    <html lang="en">
      <head>
        <title>env test</title>
      </head>
      <body>
        <Slot />
      </body>
    </html>
  );
}
