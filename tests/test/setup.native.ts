// Native-specific setup file that runs before app initializes
// This sets a global variable that tests can check to verify setupFile ran on native

declare global {
  var __setupFileRan: {
    client?: boolean;
    server?: boolean;
    native?: boolean;
  };
}

globalThis.__setupFileRan = globalThis.__setupFileRan || {};
globalThis.__setupFileRan.native = true;

console.log("[setup.native.ts] Native setup file ran");
