#!/usr/bin/env python3
"""
Erase iOS simulators (factory reset).

This script performs a factory reset on simulators, returning them to
a clean state while preserving the device UUID. Much faster than
delete + create for CI/CD cleanup.

Key features:
- Erase by UDID or device name
- Preserve device UUID (faster than delete)
- Verify erase completion
- Batch erase operations (all, by type)
"""

import argparse
import subprocess
import sys
import time
from typing import Optional

from common.device_utils import (
    list_simulators,
    resolve_device_identifier,
)


class SimulatorEraser:
    """Erase iOS simulators with optional verification."""

    def __init__(self, udid: str | None = None):
        """Initialize with optional device UDID."""
        self.udid = udid

    def erase(self, verify: bool = True, timeout_seconds: int = 30) -> tuple[bool, str]:
        """
        Erase simulator and optionally verify completion.

        Performs a factory reset, clearing all app data and settings
        while preserving the simulator UUID.

        Args:
            verify: Wait for erase to complete and verify state
            timeout_seconds: Maximum seconds to wait for verification

        Returns:
            (success, message) tuple
        """
        if not self.udid:
            return False, "Error: Device UDID not specified"

        start_time = time.time()

        # Execute erase command
        try:
            cmd = ["xcrun", "simctl", "erase", self.udid]
            result = subprocess.run(cmd, check=False, capture_output=True, text=True, timeout=60)

            if result.returncode != 0:
                error = result.stderr.strip()
                return False, f"Erase failed: {error}"
        except subprocess.TimeoutExpired:
            return False, "Erase command timed out"
        except Exception as e:
            return False, f"Erase error: {e}"

        # Optionally verify erase completion
        if verify:
            ready, verify_message = self._verify_erase(timeout_seconds)
            elapsed = time.time() - start_time
            if ready:
                return True, (
                    f"Device erased: {self.udid} " f"[factory reset complete, {elapsed:.1f}s]"
                )
            return False, verify_message

        elapsed = time.time() - start_time
        return True, (
            f"Device erase initiated: {self.udid} [{elapsed:.1f}s] "
            "(use --verify to wait for completion)"
        )

    def _verify_erase(self, timeout_seconds: int = 30) -> tuple[bool, str]:
        """
        Verify erase has completed.

        Polls device state to confirm erase finished successfully.

        Args:
            timeout_seconds: Maximum seconds to wait

        Returns:
            (success, message) tuple
        """
        start_time = time.time()
        poll_interval = 0.5
        checks = 0

        while time.time() - start_time < timeout_seconds:
            try:
                checks += 1
                # Check if device can be queried (indicates boot status)
                result = subprocess.run(
                    ["xcrun", "simctl", "spawn", self.udid, "launchctl", "list"],
                    check=False,
                    capture_output=True,
                    text=True,
                    timeout=5,
                )

                # Device responding = erase likely complete
                if result.returncode == 0:
                    elapsed = time.time() - start_time
                    return True, (
                        f"Erase verified: {self.udid} " f"[{elapsed:.1f}s, {checks} checks]"
                    )
            except (subprocess.TimeoutExpired, RuntimeError):
                pass  # Not ready yet, keep polling

            time.sleep(poll_interval)

        elapsed = time.time() - start_time
        return False, (
            f"Erase verification timeout: Device did not respond "
            f"within {elapsed:.1f}s ({checks} checks)"
        )

    @staticmethod
    def erase_all() -> tuple[int, int]:
        """
        Erase all simulators (factory reset).

        Returns:
            (succeeded, failed) tuple with counts
        """
        simulators = list_simulators(state=None)
        succeeded = 0
        failed = 0

        for sim in simulators:
            eraser = SimulatorEraser(udid=sim["udid"])
            success, _message = eraser.erase(verify=False)
            if success:
                succeeded += 1
            else:
                failed += 1

        return succeeded, failed

    @staticmethod
    def erase_by_type(device_type: str) -> tuple[int, int]:
        """
        Erase all simulators of a specific type.

        Args:
            device_type: Device type filter (e.g., "iPhone", "iPad")

        Returns:
            (succeeded, failed) tuple with counts
        """
        simulators = list_simulators(state=None)
        succeeded = 0
        failed = 0

        for sim in simulators:
            if device_type.lower() in sim["name"].lower():
                eraser = SimulatorEraser(udid=sim["udid"])
                success, _message = eraser.erase(verify=False)
                if success:
                    succeeded += 1
                else:
                    failed += 1

        return succeeded, failed

    @staticmethod
    def erase_booted() -> tuple[int, int]:
        """
        Erase all currently booted simulators.

        Returns:
            (succeeded, failed) tuple with counts
        """
        simulators = list_simulators(state="booted")
        succeeded = 0
        failed = 0

        for sim in simulators:
            eraser = SimulatorEraser(udid=sim["udid"])
            success, _message = eraser.erase(verify=False)
            if success:
                succeeded += 1
            else:
                failed += 1

        return succeeded, failed


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Erase iOS simulators (factory reset)")
    parser.add_argument(
        "--udid",
        help="Device UDID or name (required unless using --all, --type, or --booted)",
    )
    parser.add_argument(
        "--name",
        help="Device name (alternative to --udid)",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Wait for erase to complete and verify state",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="Timeout for --verify in seconds (default: 30)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Erase all simulators (factory reset)",
    )
    parser.add_argument(
        "--type",
        help="Erase all simulators of a specific type (e.g., iPhone)",
    )
    parser.add_argument(
        "--booted",
        action="store_true",
        help="Erase all currently booted simulators",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON",
    )

    args = parser.parse_args()

    # Handle batch operations
    if args.all:
        succeeded, failed = SimulatorEraser.erase_all()
        if args.json:
            import json

            print(
                json.dumps(
                    {
                        "action": "erase_all",
                        "succeeded": succeeded,
                        "failed": failed,
                        "total": succeeded + failed,
                    }
                )
            )
        else:
            total = succeeded + failed
            print(f"Erase summary: {succeeded}/{total} succeeded, " f"{failed} failed")
        sys.exit(0 if failed == 0 else 1)

    if args.type:
        succeeded, failed = SimulatorEraser.erase_by_type(args.type)
        if args.json:
            import json

            print(
                json.dumps(
                    {
                        "action": "erase_by_type",
                        "type": args.type,
                        "succeeded": succeeded,
                        "failed": failed,
                        "total": succeeded + failed,
                    }
                )
            )
        else:
            total = succeeded + failed
            print(f"Erase {args.type} summary: {succeeded}/{total} succeeded, " f"{failed} failed")
        sys.exit(0 if failed == 0 else 1)

    if args.booted:
        succeeded, failed = SimulatorEraser.erase_booted()
        if args.json:
            import json

            print(
                json.dumps(
                    {
                        "action": "erase_booted",
                        "succeeded": succeeded,
                        "failed": failed,
                        "total": succeeded + failed,
                    }
                )
            )
        else:
            total = succeeded + failed
            print(f"Erase booted summary: {succeeded}/{total} succeeded, " f"{failed} failed")
        sys.exit(0 if failed == 0 else 1)

    # Erase single device
    device_id = args.udid or args.name
    if not device_id:
        print("Error: Specify --udid, --name, --all, --type, or --booted", file=sys.stderr)
        sys.exit(1)

    try:
        udid = resolve_device_identifier(device_id)
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    # Erase device
    eraser = SimulatorEraser(udid=udid)
    success, message = eraser.erase(verify=args.verify, timeout_seconds=args.timeout)

    if args.json:
        import json

        print(
            json.dumps(
                {
                    "action": "erase",
                    "device_id": device_id,
                    "udid": udid,
                    "success": success,
                    "message": message,
                }
            )
        )
    else:
        print(message)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
