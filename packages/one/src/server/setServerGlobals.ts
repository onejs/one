export function setServerGlobals() {
  // TODO make this better, this ensures we get react 19
  process.env.VXRN_REACT_19 = '1'
  // for non-optimized stuff we need this
  // process.env.VITE_ENVIRONMENT = 'ssr'
}
