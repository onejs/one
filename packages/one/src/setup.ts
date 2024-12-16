// fixes bad import error in expo-modules-core
// without this you run into error loading web immediately
// where globalThis.expo is not defined
import 'expo-modules-core/build/createWebModule'
