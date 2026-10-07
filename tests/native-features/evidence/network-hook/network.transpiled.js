import { useEffect, useState } from "react";
import { NitroModules } from "react-native-nitro-modules";
import { rethrowNativeError } from "../nativeError";
import { assertStateListener } from "./validate";
let hybrid;
function native() {
  hybrid ?? (hybrid = NitroModules.createHybridObject("OneNetwork"));
  return hybrid;
}
function getState() {
  return native().getState().catch(rethrowNativeError);
}
function addStateListener(listener) {
  assertStateListener(listener);
  const remove = native().addStateListener(listener);
  return { remove: () => remove() };
}
function useNetworkState() {
  const [state, setState] = useState({
    type: "unknown",
    isConnected: false,
    isInternetReachable: false
  });
  useEffect(() => {
    let active = true;
    let sawEvent = false;
    getState().then((next) => {
      if (active && !sawEvent) setState(next);
    }).catch(() => {
    });
    const subscription = addStateListener((next) => {
      sawEvent = true;
      if (active) setState(next);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return state;
}
const Network = Object.freeze({ getState, addStateListener });
export {
  Network,
  useNetworkState
};
