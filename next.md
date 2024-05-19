- move away from import.meta.glob:
  - index.html loads vxs/entry
  - make `app` mandatory fs routes dir
  - remove entry-web, entry-server
  - the root _layout can optionally control navigationContainerProps by using new NavigationContainer component from vxs
  - vxs/entry is built server side and generates the routesMap

- remove react-helmet in favor of react 19 head
