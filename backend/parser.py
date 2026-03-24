import json
from collections import defaultdict
from dataclasses import dataclass

# Maps known bundle IDs to human-readable app names
KNOWN_APP_NAMES: dict[str, str] = {
    # Apple first-party
    "com.apple.weather": "Weather",
    "com.apple.mobilemail": "Mail",
    "com.apple.mobilecal": "Calendar",
    "com.apple.MobileSMS": "Messages",
    "com.apple.Maps": "Maps",
    "com.apple.facetime": "FaceTime",
    "com.apple.Health": "Health",
    "com.apple.camera": "Camera",
    "com.apple.Photos": "Photos",
    "com.apple.mobileslideshow": "Photos",
    "com.apple.Siri": "Siri",
    "com.apple.mobilephone": "Phone",
    "com.apple.mobilesafari": "Safari",
    "com.apple.AppStore": "App Store",
    "com.apple.podcasts": "Podcasts",
    "com.apple.Music": "Music",
    "com.apple.Passbook": "Wallet",
    "com.apple.ShortcutsActions": "Shortcuts",
    # Google
    "com.google.Maps": "Google Maps",
    "com.google.Gmail": "Gmail",
    "com.google.chrome.ios": "Chrome",
    # Social / messaging
    "com.kakao.talk": "KakaoTalk",
    "com.iwilab.KakaoTalk": "KakaoTalk",
    "com.instagram.Instagram": "Instagram",
    "com.facebook.Facebook": "Facebook",
    "com.facebook.Messenger": "Messenger",
    "com.twitter.twitter-iphone": "X (Twitter)",
    "net.whatsapp.WhatsApp": "WhatsApp",
    "com.snapchat.snapchat": "Snapchat",
    "com.tiktok.TikTok": "TikTok",
    "com.linkedin.LinkedIn": "LinkedIn",
    "com.discord.Discord": "Discord",
    "com.openai.chat": "ChatGPT",
    # Productivity / finance
    "com.spotify.client": "Spotify",
    "com.amazon.Amazon": "Amazon",
    "com.chase": "Chase",
    "com.vivarepublica.cash": "Cash",
    "com.ubercab.UberClient": "Uber",
    "com.zimride.instant": "Lyft",
    "pinterest": "Pinterest",
    # Shopping
    "com.inditex.zara.iphone": "Zara",
    "com.lululemon.shopapp": "Lululemon",
    # Korean apps
    "com.nhncorp.NaverMap": "Naver Maps",
    "com.jnapp.usedMarket": "Karrot",
}


@dataclass
class ParsedApp:
    """Raw extracted data for one app — no analysis or scoring."""
    bundle_id: str
    app_name: str
    categories: dict[str, int]
    access_count: int
    sample_entry: str


def get_app_name(bundle_id: str) -> str:
    if bundle_id in KNOWN_APP_NAMES:
        return KNOWN_APP_NAMES[bundle_id]
    # Use the most descriptive segment of the bundle ID
    parts = bundle_id.split(".")
    for segment in reversed(parts[:-1]):
        clean = segment.replace("-", " ").title()
        if clean.lower() not in {"com", "app", "ios", "iphone", "ipad", "mobile", "client"}:
            return clean
    return parts[-1].replace("-", " ").title()


def parse_ndjson(content: str) -> list[ParsedApp]:
    """
    Parse raw NDJSON content and return one ParsedApp per bundle ID,
    sorted by access_count descending.

    Only processes privacy access entries (those with an 'accessor' field).
    Network activity log entries are skipped.
    """
    app_entries: dict[str, list[dict]] = defaultdict(list)

    for line in content.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue

        # Skip network activity log entries — they lack an 'accessor' field
        if "accessor" not in entry:
            continue

        bundle_id = entry["accessor"].get("identifier", "unknown")
        app_entries[bundle_id].append(entry)

    results: list[ParsedApp] = []

    for bundle_id, entries in app_entries.items():
        # Count only intervalBegin events as the start of each access
        categories: dict[str, int] = defaultdict(int)
        for entry in entries:
            kind = entry.get("kind", "")
            if kind in ("intervalBegin", "access", ""):
                cat = entry.get("category")
                if cat:
                    categories[cat] += 1

        # Fallback: if all entries were intervalEnd, count everything
        if not categories:
            for entry in entries:
                cat = entry.get("category")
                if cat:
                    categories[cat] += 1

        results.append(
            ParsedApp(
                bundle_id=bundle_id,
                app_name=get_app_name(bundle_id),
                categories=dict(categories),
                access_count=sum(categories.values()),
                sample_entry=json.dumps(entries[0]),
            )
        )

    return sorted(results, key=lambda a: a.access_count, reverse=True)
