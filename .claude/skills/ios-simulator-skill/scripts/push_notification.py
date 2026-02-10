#!/usr/bin/env python3
"""
iOS Push Notification Simulator

Send simulated push notifications to test notification handling.
Supports custom payloads and test tracking.

Usage: python scripts/push_notification.py --bundle-id com.app --title "Alert" --body "Message"
"""

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from common import resolve_udid


class PushNotificationSender:
    """Sends simulated push notifications to iOS simulator."""

    def __init__(self, udid: str | None = None):
        """Initialize push notification sender.

        Args:
            udid: Optional device UDID (auto-detects booted simulator if None)
        """
        self.udid = udid

    def send(
        self,
        bundle_id: str,
        payload: dict | str,
        _test_name: str | None = None,
        _expected_behavior: str | None = None,
    ) -> bool:
        """
        Send push notification to app.

        Args:
            bundle_id: Target app bundle ID
            payload: Push payload (dict or JSON string) or path to JSON file
            test_name: Test scenario name for tracking
            expected_behavior: Expected behavior after notification arrives

        Returns:
            Success status
        """
        # Handle different payload formats
        if isinstance(payload, str):
            # Check if it's a file path
            payload_path = Path(payload)
            if payload_path.exists():
                with open(payload_path) as f:
                    payload_data = json.load(f)
            else:
                # Try to parse as JSON string
                try:
                    payload_data = json.loads(payload)
                except json.JSONDecodeError:
                    print(f"Error: Invalid JSON payload: {payload}")
                    return False
        else:
            payload_data = payload

        # Ensure payload has aps dictionary
        if "aps" not in payload_data:
            payload_data = {"aps": payload_data}

        # Create temp file with payload
        try:
            with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
                json.dump(payload_data, f)
                temp_payload_path = f.name

            # Build simctl command
            cmd = ["xcrun", "simctl", "push"]

            if self.udid:
                cmd.append(self.udid)
            else:
                cmd.append("booted")

            cmd.extend([bundle_id, temp_payload_path])

            # Send notification
            subprocess.run(cmd, capture_output=True, text=True, check=True)

            # Clean up temp file
            Path(temp_payload_path).unlink()

            return True

        except subprocess.CalledProcessError as e:
            print(f"Error sending push notification: {e.stderr}")
            return False
        except Exception as e:
            print(f"Error: {e}")
            return False

    def send_simple(
        self,
        bundle_id: str,
        title: str | None = None,
        body: str | None = None,
        badge: int | None = None,
        sound: bool = True,
    ) -> bool:
        """
        Send simple push notification with common parameters.

        Args:
            bundle_id: Target app bundle ID
            title: Alert title
            body: Alert body
            badge: Badge number
            sound: Whether to play sound

        Returns:
            Success status
        """
        payload = {}

        if title or body:
            alert = {}
            if title:
                alert["title"] = title
            if body:
                alert["body"] = body
            payload["alert"] = alert

        if badge is not None:
            payload["badge"] = badge

        if sound:
            payload["sound"] = "default"

        # Wrap in aps
        full_payload = {"aps": payload}

        return self.send(bundle_id, full_payload)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Send simulated push notification to iOS app")

    # Required
    parser.add_argument(
        "--bundle-id", required=True, help="Target app bundle ID (e.g., com.example.app)"
    )

    # Simple payload options
    parser.add_argument("--title", help="Alert title (for simple notifications)")
    parser.add_argument("--body", help="Alert body message")
    parser.add_argument("--badge", type=int, help="Badge number")
    parser.add_argument("--no-sound", action="store_true", help="Don't play notification sound")

    # Custom payload
    parser.add_argument(
        "--payload",
        help="Custom JSON payload file or inline JSON string",
    )

    # Test tracking
    parser.add_argument("--test-name", help="Test scenario name for tracking")
    parser.add_argument(
        "--expected",
        help="Expected behavior after notification",
    )

    # Device
    parser.add_argument(
        "--udid",
        help="Device UDID (auto-detects booted simulator if not provided)",
    )

    args = parser.parse_args()

    # Resolve UDID with auto-detection
    try:
        udid = resolve_udid(args.udid)
    except RuntimeError as e:
        print(f"Error: {e}")
        sys.exit(1)

    sender = PushNotificationSender(udid=udid)

    # Send notification
    if args.payload:
        # Custom payload mode
        success = sender.send(args.bundle_id, args.payload)
    else:
        # Simple notification mode
        success = sender.send_simple(
            args.bundle_id,
            title=args.title,
            body=args.body,
            badge=args.badge,
            sound=not args.no_sound,
        )

    if success:
        # Token-efficient output
        output = "Push notification sent"

        if args.test_name:
            output += f" (test: {args.test_name})"

        print(output)

        if args.expected:
            print(f"Expected: {args.expected}")

        print()
        print("Notification details:")
        if args.title:
            print(f"  Title: {args.title}")
        if args.body:
            print(f"  Body: {args.body}")
        if args.badge:
            print(f"  Badge: {args.badge}")

        print()
        print("Verify notification handling:")
        print("1. Check app log output: python scripts/log_monitor.py --app " + args.bundle_id)
        print(
            "2. Capture state: python scripts/app_state_capture.py --app-bundle-id "
            + args.bundle_id
        )

    else:
        print("Failed to send push notification")
        sys.exit(1)


if __name__ == "__main__":
    main()
