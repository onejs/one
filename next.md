- move clientTreeShakePlugin.ts to use:
  - https://github.com/pcattori/babel-dead-code-elimination

- we need to ensure any dep that depends on a optimizedep transitively is optimized as well, eg react, or else you end up with duplications

