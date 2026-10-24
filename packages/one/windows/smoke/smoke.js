// The smoke surface: builds a Fabric tree through nativeFabricUIManager the way
// React's Fabric renderer does (createNode, appendChild, a child set and
// completeRoot), so Yoga lays it out in the core. main.cpp checks the frames.
// Every View sets collapsable false so view flattening keeps it in the mounted
// tree.
//   root 800x600
//   └ 2 View  flex 1, row, padding 20
//     ├ 4 View  100x50
//     ├ 6 View  flex 1, height 50, marginLeft 10
//     └ 8 Paragraph  width 200, stretched
//       └ 10 RawText "hello windows"
var runtime = HermesInternal.getRuntimeProperties();
console.log('smoke: hermes ' + runtime['OSS Release Version'] + ', bytecode ' + runtime['Bytecode Version']);

globalThis.RN$AppRegistry = {
  runApplication: function (appKey, params) {
    var ui = nativeFabricUIManager;
    var root = params.rootTag;
    function node(tag, name, props) {
      if (name === 'RCTView') {
        props.collapsable = false;
      }
      return ui.createNode(tag, name, root, props, { tag: tag });
    }
    var container = node(2, 'RCTView', { flex: 1, flexDirection: 'row', padding: 20 });
    ui.appendChild(container, node(4, 'RCTView', { width: 100, height: 50 }));
    ui.appendChild(container, node(6, 'RCTView', { flex: 1, height: 50, marginLeft: 10 }));
    var paragraph = node(8, 'RCTParagraph', { width: 200 });
    ui.appendChild(paragraph, node(10, 'RCTRawText', { text: 'hello windows' }));
    ui.appendChild(container, paragraph);
    var children = ui.createChildSet();
    ui.appendChildToSet(children, container);
    ui.completeRoot(root, children);
    console.log('smoke: completeRoot ' + appKey + ' surface ' + root);
  },
};
globalThis.RN$stopSurface = function () {};
