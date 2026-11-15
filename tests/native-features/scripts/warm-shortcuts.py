#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import time

udid = os.environ["SIMULATOR_UDID"]
bundle = "com.apple.shortcuts"
started = time.monotonic()
deadline = started + 90


def remaining():
    return max(1, deadline - time.monotonic())


launched = subprocess.check_output(
    ["xcrun", "simctl", "launch", udid, bundle], text=True,
    timeout=remaining(),
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
    described = subprocess.run(
        ["axe", "describe-ui", "--udid", udid], text=True, capture_output=True,
        timeout=remaining(),
    )
    if described.returncode != 0:
        # a freshly booted simulator can launch apps before its automation
        # session is ready; one-native-conformance.ts waits the same way.
        if "Timed out creating the simulator remote automation session" \
                not in described.stderr + described.stdout:
            sys.stderr.write(described.stderr)
            raise subprocess.CalledProcessError(
                described.returncode, described.args,
                described.stdout, described.stderr)
        time.sleep(0.25)
        continue
    if has_control(json.loads(described.stdout)):
        break
    time.sleep(0.1)
else:
    raise TimeoutError("Shortcuts did not expose its accessible controls")


def shortcuts_pid_alive():
    listed = subprocess.run(
        ["xcrun", "simctl", "spawn", udid, "launchctl", "list"],
        text=True, capture_output=True, timeout=remaining(),
    )
    if listed.returncode != 0:
        return False
    for line in listed.stdout.splitlines():
        fields = line.split()
        if (len(fields) >= 3 and fields[0] == str(pid)
                and fields[2].startswith("UIKitApplication:com.apple.shortcuts[")):
            return True
    return False


def shortcuts_foregrounded():
    described = subprocess.run(
        ["axe", "describe-ui", "--udid", udid], text=True, capture_output=True,
        timeout=remaining(),
    )
    if described.returncode != 0:
        return True
    return has_control(json.loads(described.stdout))


# leave shortcuts warm but backgrounded (queryAppState 3): terminating it here
# forces the ShortcutsLink test to cold-launch within its 10s assertion.
subprocess.run(
    ["xcrun", "simctl", "launch", udid, "com.apple.springboard"], check=True,
    capture_output=True, text=True, timeout=remaining(),
)
while time.monotonic() < deadline:
    if not shortcuts_foregrounded():
        break
    time.sleep(0.25)
else:
    raise TimeoutError("Shortcuts stayed foregrounded after SpringBoard launch")
if not shortcuts_pid_alive():
    raise TimeoutError(f"Shortcuts pid {pid} died while backgrounding")
print(json.dumps({"bundle": bundle, "pid": pid,
                  "startupSeconds": round(time.monotonic() - started, 3),
                  "state": "background"}))
