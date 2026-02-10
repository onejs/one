#!/usr/bin/env python3
"""
iOS Privacy & Permissions Manager

Grant/revoke app permissions for testing permission flows.
Supports 13+ services with audit trail tracking.

Usage: python scripts/privacy_manager.py --grant camera --bundle-id com.app
"""

import argparse
import subprocess
import sys
from datetime import datetime

from common import resolve_udid


class PrivacyManager:
    """Manages iOS app privacy and permissions."""

    # Supported services
    SUPPORTED_SERVICES = {
        "camera": "Camera access",
        "microphone": "Microphone access",
        "location": "Location services",
        "contacts": "Contacts access",
        "photos": "Photos library access",
        "calendar": "Calendar access",
        "health": "Health data access",
        "reminders": "Reminders access",
        "motion": "Motion & fitness",
        "keyboard": "Keyboard access",
        "mediaLibrary": "Media library",
        "calls": "Call history",
        "siri": "Siri access",
    }

    def __init__(self, udid: str | None = None):
        """Initialize privacy manager.

        Args:
            udid: Optional device UDID (auto-detects booted simulator if None)
        """
        self.udid = udid

    def grant_permission(
        self,
        bundle_id: str,
        service: str,
        scenario: str | None = None,
        step: int | None = None,
    ) -> bool:
        """
        Grant permission for app.

        Args:
            bundle_id: App bundle ID
            service: Service name (camera, microphone, location, etc.)
            scenario: Test scenario name for audit trail
            step: Step number in test scenario

        Returns:
            Success status
        """
        if service not in self.SUPPORTED_SERVICES:
            print(f"Error: Unknown service '{service}'")
            print(f"Supported: {', '.join(self.SUPPORTED_SERVICES.keys())}")
            return False

        cmd = ["xcrun", "simctl", "privacy"]

        if self.udid:
            cmd.append(self.udid)
        else:
            cmd.append("booted")

        cmd.extend(["grant", service, bundle_id])

        try:
            subprocess.run(cmd, capture_output=True, check=True)

            # Log audit entry
            self._log_audit("grant", bundle_id, service, scenario, step)

            return True
        except subprocess.CalledProcessError:
            return False

    def revoke_permission(
        self,
        bundle_id: str,
        service: str,
        scenario: str | None = None,
        step: int | None = None,
    ) -> bool:
        """
        Revoke permission for app.

        Args:
            bundle_id: App bundle ID
            service: Service name
            scenario: Test scenario name for audit trail
            step: Step number in test scenario

        Returns:
            Success status
        """
        if service not in self.SUPPORTED_SERVICES:
            print(f"Error: Unknown service '{service}'")
            return False

        cmd = ["xcrun", "simctl", "privacy"]

        if self.udid:
            cmd.append(self.udid)
        else:
            cmd.append("booted")

        cmd.extend(["revoke", service, bundle_id])

        try:
            subprocess.run(cmd, capture_output=True, check=True)

            # Log audit entry
            self._log_audit("revoke", bundle_id, service, scenario, step)

            return True
        except subprocess.CalledProcessError:
            return False

    def reset_permission(
        self,
        bundle_id: str,
        service: str,
        scenario: str | None = None,
        step: int | None = None,
    ) -> bool:
        """
        Reset permission to default.

        Args:
            bundle_id: App bundle ID
            service: Service name
            scenario: Test scenario name for audit trail
            step: Step number in test scenario

        Returns:
            Success status
        """
        if service not in self.SUPPORTED_SERVICES:
            print(f"Error: Unknown service '{service}'")
            return False

        cmd = ["xcrun", "simctl", "privacy"]

        if self.udid:
            cmd.append(self.udid)
        else:
            cmd.append("booted")

        cmd.extend(["reset", service, bundle_id])

        try:
            subprocess.run(cmd, capture_output=True, check=True)

            # Log audit entry
            self._log_audit("reset", bundle_id, service, scenario, step)

            return True
        except subprocess.CalledProcessError:
            return False

    @staticmethod
    def _log_audit(
        action: str,
        bundle_id: str,
        service: str,
        scenario: str | None = None,
        step: int | None = None,
    ) -> None:
        """Log permission change to audit trail (for test tracking).

        Args:
            action: grant, revoke, or reset
            bundle_id: App bundle ID
            service: Service name
            scenario: Test scenario name
            step: Step number
        """
        # Could write to file, but for now just log to stdout for transparency
        timestamp = datetime.now().isoformat()
        location = f" (step {step})" if step else ""
        scenario_info = f" in {scenario}" if scenario else ""
        print(
            f"[Audit] {timestamp}: {action.upper()} {service} for {bundle_id}{scenario_info}{location}"
        )


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Manage iOS app privacy and permissions")

    # Required
    parser.add_argument("--bundle-id", required=True, help="App bundle ID (e.g., com.example.app)")

    # Action (mutually exclusive)
    action_group = parser.add_mutually_exclusive_group(required=True)
    action_group.add_argument(
        "--grant",
        help="Grant permission (service name or comma-separated list)",
    )
    action_group.add_argument(
        "--revoke", help="Revoke permission (service name or comma-separated list)"
    )
    action_group.add_argument(
        "--reset",
        help="Reset permission to default (service name or comma-separated list)",
    )
    action_group.add_argument(
        "--list",
        action="store_true",
        help="List all supported services",
    )

    # Test tracking
    parser.add_argument(
        "--scenario",
        help="Test scenario name for audit trail",
    )
    parser.add_argument("--step", type=int, help="Step number in test scenario")

    # Device
    parser.add_argument(
        "--udid",
        help="Device UDID (auto-detects booted simulator if not provided)",
    )

    args = parser.parse_args()

    # List supported services
    if args.list:
        print("Supported Privacy Services:\n")
        for service, description in PrivacyManager.SUPPORTED_SERVICES.items():
            print(f"  {service:<15} - {description}")
        print()
        print("Examples:")
        print("  python scripts/privacy_manager.py --grant camera --bundle-id com.app")
        print("  python scripts/privacy_manager.py --revoke location --bundle-id com.app")
        print("  python scripts/privacy_manager.py --grant camera,photos --bundle-id com.app")
        sys.exit(0)

    # Resolve UDID with auto-detection
    try:
        udid = resolve_udid(args.udid)
    except RuntimeError as e:
        print(f"Error: {e}")
        sys.exit(1)

    manager = PrivacyManager(udid=udid)

    # Parse service names (support comma-separated list)
    if args.grant:
        services = [s.strip() for s in args.grant.split(",")]
        action = "grant"
        action_fn = manager.grant_permission
    elif args.revoke:
        services = [s.strip() for s in args.revoke.split(",")]
        action = "revoke"
        action_fn = manager.revoke_permission
    else:  # reset
        services = [s.strip() for s in args.reset.split(",")]
        action = "reset"
        action_fn = manager.reset_permission

    # Execute action for each service
    all_success = True
    for service in services:
        if service not in PrivacyManager.SUPPORTED_SERVICES:
            print(f"Error: Unknown service '{service}'")
            all_success = False
            continue

        success = action_fn(
            args.bundle_id,
            service,
            scenario=args.scenario,
            step=args.step,
        )

        if success:
            description = PrivacyManager.SUPPORTED_SERVICES[service]
            print(f"✓ {action.capitalize()} {service}: {description}")
        else:
            print(f"✗ Failed to {action} {service}")
            all_success = False

    if not all_success:
        sys.exit(1)

    # Summary
    if len(services) > 1:
        print(f"\nPermissions {action}ed: {', '.join(services)}")

    if args.scenario:
        print(f"Test scenario: {args.scenario}" + (f" (step {args.step})" if args.step else ""))


if __name__ == "__main__":
    main()
