# One 2.9.0 release

Ship the generated iOS SDK and native interface work in PR #961 as one minor release.

## Included

- Generated runtime facades and declarations for 290 iOS frameworks, with explicit unsupported-member filtering.
- SDK-derived SwiftUI hosts, UIKit interoperability, unified-module migrations, observation and inherited main-actor isolation.
- React content hosted in UIKit collection cells, table cells and ordinary UIKit views.
- Generated parameterized values, numeric ranges, defaulted slot options and gesture reporting, plus native drag binding inside a fixed React Native host.
- Matching documentation, declarations and the prepared 2.9.0 package family.

## Closeout

The final SDK artifacts use ABI `0e503aef608672fa`. The coherent native app compiles and starts. Bounded native proofs cover UIKit content presses, resizing, unmount/remount and replacement; generated hosts; gesture events; drag movement while JavaScript is blocked and all three snap targets; multiline ranges and inset options. These are behavior proofs, not exhaustive coverage or hardware performance claims.

Complete the Share flow, same-module subclass/inherited-method smoke, and both full CI workflows on the release revision. Keep unsupported APIs and placement limitations explicit. API name coverage does not imply that every overload or callback shape is supported.

After release review, merge the minor release PR, publish the prepared stable version through the release workflow, and verify the exact npm artifact’s source revision and changed runtime bytes.
