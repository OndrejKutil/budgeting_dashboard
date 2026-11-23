#!/usr/bin/env python3
"""Writes the SideStore/AltStore source (source.json) for one Budget build.

SideStore shows an update when the first entry in `versions` differs from the installed
version. It compares `version` as strict X.Y.Z, which is why builds are numbered 1.0.<run>.
The IPA's CFBundleShortVersionString / CFBundleVersion must equal `version` / `buildVersion`.

Usage: make-source.py --ipa PATH --version 1.0.7 --build 7 --download-url URL
       [--notes TEXT] --out source.json
Format: https://faq.altstore.io/developers/make-a-source
"""
import argparse
import hashlib
import json
import os
from datetime import datetime, timezone

REPO_RAW = "https://raw.githubusercontent.com/OndrejKutil/budgeting_dashboard/main"
ICON_URL = f"{REPO_RAW}/src/mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ipa", required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--build", required=True)
    parser.add_argument("--download-url", required=True)
    parser.add_argument("--notes", default="")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    with open(args.ipa, "rb") as handle:
        sha256 = hashlib.sha256(handle.read()).hexdigest()

    source = {
        "name": "Budget",
        "identifier": "com.ondrejkutil.budget.source",
        "subtitle": "Native iPhone shell for budget.ondrejkutil.com",
        "website": "https://budget.ondrejkutil.com",
        "iconURL": ICON_URL,
        "tintColor": "F5A623",
        "apps": [
            {
                "name": "Budget",
                "bundleIdentifier": "com.ondrejkutil.budget",
                "developerName": "Ondřej Kutil",
                "subtitle": "Personal budgeting dashboard",
                "localizedDescription": (
                    "Native shell around budget.ondrejkutil.com: Face ID lock, local notifications "
                    "and (later) a home-screen widget. Site changes appear without an update; "
                    "updates here are only for the native part."
                ),
                "iconURL": ICON_URL,
                "tintColor": "F5A623",
                "category": "utilities",
                "versions": [
                    {
                        "version": args.version,
                        "buildVersion": args.build,
                        "date": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "localizedDescription": args.notes or f"Build {args.build}",
                        "downloadURL": args.download_url,
                        "size": os.path.getsize(args.ipa),
                        "sha256": sha256,
                        "minOSVersion": "15.0",
                    }
                ],
                "appPermissions": {
                    "entitlements": [],
                    "privacy": {
                        "NSFaceIDUsageDescription": "Budget uses Face ID to keep your finances private."
                    },
                },
            }
        ],
        "news": [],
    }

    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(source, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


if __name__ == "__main__":
    main()
