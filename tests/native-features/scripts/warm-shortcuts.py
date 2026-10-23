#!/usr/bin/env python3
import json
import os
import subprocess
import time

udid = os.environ["SIMULATOR_UDID"]
bundle = "com.apple.shortcuts"
started = time.monotonic()
deadline = started + 90
launched = subprocess.check_output(
    ["xcrun", "simctl", "launch", udid, bundle], text=True, timeout=30
)
pid = int(launched.strip().rsplit(":", 1)[1])


def has_control(node):
    if isinstance(node, list):
        return any(has_control(child) for child in node)
    if not isinstance(node, dict):
        return False
    frame = node.get("frame") or {}
    if (node.get("pid") == pid and node.get("role") == "AXButton"
            and node.get("AXLabel") and node.get("enabled")
            and frame.get("width", 0) > 0 and frame.get("height", 0) > 0):
        return True
    return has_control(node.get("children", []))


while time.monotonic() < deadline:
    snapshot = json.loads(subprocess.check_output(
        ["axe", "describe-ui", "--udid", udid], text=True,
        timeout=max(1, deadline - time.monotonic()),
    ))
    if has_control(snapshot):
        break
    time.sleep(0.1)
else:
    raise TimeoutError("Shortcuts did not expose its accessible controls")
subprocess.run(["xcrun", "simctl", "terminate", udid, bundle], check=True)
print(json.dumps({"bundle": bundle, "pid": pid,
                  "startupSeconds": round(time.monotonic() - started, 3)}))
