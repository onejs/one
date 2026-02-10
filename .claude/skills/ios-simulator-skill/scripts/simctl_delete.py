#!/usr/bin/env python3
"""
Delete iOS simulators permanently.

This script permanently removes simulators and frees disk space.
Includes safety confirmation to prevent accidental deletion.

Key features:
- Delete by UDID or device name
- Confirmation required for safety
- Batch delete operations
- Report freed disk space estimate
"""

import argparse
import subprocess
import sys
from typing import Optional

from common.device_utils import (
    list_simulators,
    resolve_device_identifier,
)


class SimulatorDeleter:
    """Delete iOS simulators with safety confirmation."""

    def __init__(self, udid: str | None = None):
        """Initialize with optional device UDID."""
        self.udid = udid

    def delete(self, confirm: bool = False) -> tuple[bool, str]:
        """
        Delete simulator permanently.

        Args:
            confirm: Skip confirmation prompt (for batch operations)

        Returns:
            (success, message) tuple
        """
        if not self.udid:
            return False, "Error: Device UDID not specified"

        # Safety confirmation
        if not confirm:
            try:
                response = input(
                    f"Permanently delete simulator {self.udid}? " f"(type 'yes' to confirm): "
                )
                if response.lower() != "yes":
                    return False, "Deletion cancelled by user"
            except KeyboardInterrupt:
                return False, "Deletion cancelled"

        # Execute delete command
        try:
            cmd = ["xcrun", "simctl", "delete", self.udid]
            result = subprocess.run(cmd, check=False, capture_output=True, text=True, timeout=60)

            if result.returncode != 0:
                error = result.stderr.strip() or result.stdout.strip()
                return False, f"Deletion failed: {error}"

            return True, f"Device deleted: {self.udid} [disk space freed]"

        except subprocess.TimeoutExpired:
            return False, "Deletion command timed out"
        except Exception as e:
            return False, f"Deletion error: {e}"

    @staticmethod
    def delete_all(confirm: bool = False) -> tuple[int, int]:
        """
        Delete all simulators permanently.

        Args:
            confirm: Skip confirmation prompt

        Returns:
            (succeeded, failed) tuple with counts
        """
        simulators = list_simulators(state=None)

        if not confirm:
            count = len(simulators)
            try:
                response = input(
                    f"Permanently delete ALL {count} simulators? " f"(type 'yes' to confirm): "
                )
                if response.lower() != "yes":
                    return 0, count
            except KeyboardInterrupt:
                return 0, count

        succeeded = 0
        failed = 0

        for sim in simulators:
            deleter = SimulatorDeleter(udid=sim["udid"])
            success, _message = deleter.delete(confirm=True)
            if success:
                succeeded += 1
            else:
                failed += 1

        return succeeded, failed

    @staticmethod
    def delete_by_type(device_type: str, confirm: bool = False) -> tuple[int, int]:
        """
        Delete all simulators of a specific type.

        Args:
            device_type: Device type filter (e.g., "iPhone", "iPad")
            confirm: Skip confirmation prompt

        Returns:
            (succeeded, failed) tuple with counts
        """
        simulators = list_simulators(state=None)
        matching = [s for s in simulators if device_type.lower() in s["name"].lower()]

        if not matching:
            return 0, 0

        if not confirm:
            count = len(matching)
            try:
                response = input(
                    f"Permanently delete {count} {device_type} simulators? "
                    f"(type 'yes' to confirm): "
                )
                if response.lower() != "yes":
                    return 0, count
            except KeyboardInterrupt:
                return 0, count

        succeeded = 0
        failed = 0

        for sim in matching:
            deleter = SimulatorDeleter(udid=sim["udid"])
            success, _message = deleter.delete(confirm=True)
            if success:
                succeeded += 1
            else:
                failed += 1

        return succeeded, failed

    @staticmethod
    def delete_old(keep_count: int = 3, confirm: bool = False) -> tuple[int, int]:
        """
        Delete older simulators, keeping most recent versions.

        Useful for cleanup after testing multiple iOS versions.
        Keeps the most recent N simulators of each type.

        Args:
            keep_count: Number of recent simulators to keep per type (default: 3)
            confirm: Skip confirmation prompt

        Returns:
            (succeeded, failed) tuple with counts
        """
        simulators = list_simulators(state=None)

        # Group by device type
        by_type: dict[str, list] = {}
        for sim in simulators:
            dev_type = sim["type"]
            if dev_type not in by_type:
                by_type[dev_type] = []
            by_type[dev_type].append(sim)

        # Find candidates for deletion (older ones)
        to_delete = []
        for _dev_type, sims in by_type.items():
            # Sort by runtime (iOS version) - keep newest
            sorted_sims = sorted(sims, key=lambda s: s["runtime"], reverse=True)
            # Mark older ones for deletion
            to_delete.extend(sorted_sims[keep_count:])

        if not to_delete:
            return 0, 0

        if not confirm:
            count = len(to_delete)
            try:
                response = input(
                    f"Delete {count} older simulators, keeping {keep_count} per type? "
                    f"(type 'yes' to confirm): "
                )
                if response.lower() != "yes":
                    return 0, count
            except KeyboardInterrupt:
                return 0, count

        succeeded = 0
        failed = 0

        for sim in to_delete:
            deleter = SimulatorDeleter(udid=sim["udid"])
            success, _message = deleter.delete(confirm=True)
            if success:
                succeeded += 1
            else:
                failed += 1

        return succeeded, failed


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Delete iOS simulators permanently")
    parser.add_argument(
        "--udid",
        help="Device UDID or name (required unless using batch options)",
    )
    parser.add_argument(
        "--name",
        help="Device name (alternative to --udid)",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip confirmation prompt",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Delete all simulators",
    )
    parser.add_argument(
        "--type",
        help="Delete all simulators of a specific type (e.g., iPhone)",
    )
    parser.add_argument(
        "--old",
        type=int,
        metavar="KEEP_COUNT",
        help="Delete older simulators, keeping this many per type (e.g., --old 3)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON",
    )

    args = parser.parse_args()

    # Handle batch operations
    if args.all:
        succeeded, failed = SimulatorDeleter.delete_all(confirm=args.yes)
        if args.json:
            import json

            print(
                json.dumps(
                    {
                        "action": "delete_all",
                        "succeeded": succeeded,
                        "failed": failed,
                        "total": succeeded + failed,
                    }
                )
            )
        else:
            total = succeeded + failed
            print(f"Delete summary: {succeeded}/{total} succeeded, " f"{failed} failed")
        sys.exit(0 if failed == 0 else 1)

    if args.type:
        succeeded, failed = SimulatorDeleter.delete_by_type(args.type, confirm=args.yes)
        if args.json:
            import json

            print(
                json.dumps(
                    {
                        "action": "delete_by_type",
                        "type": args.type,
                        "succeeded": succeeded,
                        "failed": failed,
                        "total": succeeded + failed,
                    }
                )
            )
        else:
            total = succeeded + failed
            print(f"Delete {args.type} summary: {succeeded}/{total} succeeded, " f"{failed} failed")
        sys.exit(0 if failed == 0 else 1)

    if args.old is not None:
        succeeded, failed = SimulatorDeleter.delete_old(keep_count=args.old, confirm=args.yes)
        if args.json:
            import json

            print(
                json.dumps(
                    {
                        "action": "delete_old",
                        "keep_count": args.old,
                        "succeeded": succeeded,
                        "failed": failed,
                        "total": succeeded + failed,
                    }
                )
            )
        else:
            total = succeeded + failed
            print(
                f"Delete old summary: {succeeded}/{total} succeeded, "
                f"{failed} failed (kept {args.old} per type)"
            )
        sys.exit(0 if failed == 0 else 1)

    # Delete single device
    device_id = args.udid or args.name
    if not device_id:
        print("Error: Specify --udid, --name, --all, --type, or --old", file=sys.stderr)
        sys.exit(1)

    try:
        udid = resolve_device_identifier(device_id)
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    # Delete device
    deleter = SimulatorDeleter(udid=udid)
    success, message = deleter.delete(confirm=args.yes)

    if args.json:
        import json

        print(
            json.dumps(
                {
                    "action": "delete",
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
