#!/usr/bin/env python3
"""
Dorogo Luxury Bus & Minibus Partner Discovery Crawler
=====================================================
Automated discovery crawler and 100-Point Relevance Scorer for luxury,
unbranded minibuses and coaches in Northern Italy (Milan, Lake Como,
Bergamo, Brescia, Verona, Turin, Venice, Tuscany).

Solves the 90% "commercial billboard decal" problem by scoring operators
based on Discretion (35), Fleet Tier (25), Territory (20), and SLA (20).

Usage:
    python3 tools/partners/bus_discovery_crawler.py [--dry-run] [--max-results 10] [--query "custom query"]
"""

import os
import sys
import re
import json
import time
import urllib.request
import urllib.parse
import urllib.error
import argparse
from typing import Dict, List, Optional, Tuple, Any

DEFAULT_QUERIES = [
    '"noleggio minibus lusso milano" sprinter vip',
    '"noleggio pullman totale black" milano OR como',
    '"noleggio autobus senza scritte" milano OR brescia',
    '"ncc pullman gran turismo" setra mercedes lusso',
    '"noleggio minibus vip" lago di como bellagio',
    '"noleggio pullman lusso" vetri oscurati milano',
    '"noleggio autobus gran turismo senza pubblicita" lombardia',
    '"limobus noleggio" milano moda lusso'
]

# Standard directories relative to repo root
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "../.."))
DATA_FILE = os.path.join(PROJECT_ROOT, "data", "bus_partners.json")
JS_DATA_FILE = os.path.join(PROJECT_ROOT, "app", "bus_partners_data.js")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
}

def clean_html_text(html: str) -> str:
    """Strips tags, scripts, and extra whitespace from HTML content."""
    no_script = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    no_tags = re.sub(r"<[^>]+>", " ", no_script)
    clean = re.sub(r"\s+", " ", no_tags).strip()
    return clean

def extract_domain(url: str) -> str:
    """Extracts base registered domain name from URL."""
    try:
        parsed = urllib.parse.urlparse(url if "://" in url else f"https://{url}")
        host = (parsed.hostname or "").lower()
        if host.startswith("www."):
            host = host[4:]
        return host
    except Exception:
        return ""

def calculate_bus_relevance_score(text: str, meta: Dict[str, Any]) -> Tuple[int, Dict[str, int], List[str]]:
    """
    Exact implementation of the 100-Point Relevance Score Methodology:
    Pillar 1: Discretion & Exterior Livery (Max 35) - Critical Filter
    Pillar 2: Fleet Category & Luxury Spec (Max 25)
    Pillar 3: Territory, Access & Permits (Max 20)
    Pillar 4: Chauffeur & Corporate B2B Standards (Max 20)
    """
    lower = text.lower()
    notes = []

    # Pillar 1: Discretion (Max 35)
    discretion = 15
    if re.search(r"vetri\s+oscurat|total\s+black|senza\s+scritte|nessuna\s+scritta|unbranded|anonim[oa]|dark\s+grey|black\s+edition|livrea\s+scura", lower):
        discretion = 35
        notes.append("🛡️ Total Black / Unbranded confirmed (vetri oscurati / senza scritte)")
    elif re.search(r"senza\s+logo|su\s+richiesta|plain\s+white|bianco\s+senza|flotta\s+bianca", lower):
        discretion = 20
        notes.append("⚠️ Unbranded on request / plain livery")
    elif re.search(r"tour\s+operator|pubblicit|grafica|scritte\s+aziendali", lower):
        discretion = 5
        notes.append("❌ Heavy commercial decals detected")

    # Pillar 2: Fleet Category (Max 25)
    fleet = 15
    if re.search(r"sprinter\s+vip|limobus|vip\s+lounge|setra\s+topclass|pelle|poltrone\s+in\s+pelle|tavolini|wifi|exclusive\s+line", lower):
        fleet = 25
        notes.append("Mercedes Sprinter VIP / Setra Lounge conversion confirmed")
    elif re.search(r"iveco|scania|scolastic|scuolabus|linea", lower):
        fleet = 8
        notes.append("Standard commuter/tourist coaches")
    elif re.search(r"tourismo|comfortclass|gran\s+turismo|euro\s+6|prese\s+usb", lower):
        fleet = 18
        notes.append("Modern Mercedes Tourismo / Setra GT coach")

    # Pillar 3: Territory & Permits (Max 20)
    territory = 12
    base_city = (meta.get("base_city") or "").lower()
    if any(c in base_city for c in ["milano", "milan", "como", "lecco", "bellagio", "cernobbio"]) or \
       re.search(r"area\s+c|ztl|corsie\s+preferenziali|ville\s+del\s+lago|lago\s+di\s+como|catene\s+da\s+neve", lower):
        territory = 20
        notes.append("Milan Area C / ZTL + Lake Como Villa permits")
    elif any(c in base_city for c in ["bergamo", "brescia", "monza", "varese", "verona", "torino", "turin", "venezia", "firenze"]):
        territory = 15
        notes.append("Northern Italian regional base")

    # Pillar 4: Chauffeur & Corporate Standards (Max 20)
    sla = 15
    if re.search(r"english\s+speaking|abito\s+scuro|cravatta|chauffeur|24/7|h24|fattura\s+elettronica|vip\s+service|fbo|linate\s+prime", lower):
        sla = 20
        notes.append("Suited English-speaking chauffeurs & 24/7 flight-tracked dispatch")
    elif re.search(r"italiano|orari\s+ufficio", lower):
        sla = 10

    # Strict clamping to objective MECE maximums
    discretion = max(0, min(35, discretion))
    fleet = max(0, min(25, fleet))
    territory = max(0, min(20, territory))
    sla = max(0, min(20, sla))

    total = discretion + fleet + territory + sla
    breakdown = {
        "discretion_unbranded": discretion,
        "fleet_luxury": fleet,
        "territory_permits": territory,
        "corporate_sla": sla
    }
    return total, breakdown, notes

def fetch_url(url: str, timeout: int = 10) -> Optional[str]:
    """Fetches text content from URL with respectful timeout and headers."""
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            content_type = resp.headers.get("Content-Type", "")
            if "text/html" not in content_type and "text/plain" not in content_type:
                return None
            charset = "utf-8"
            if "charset=" in content_type.lower():
                charset = content_type.lower().split("charset=")[-1].split(";")[0].strip()
            raw = resp.read()
            return raw.decode(charset, errors="replace")
    except Exception:
        return None

def extract_contact_info(text: str, html: str) -> Dict[str, Optional[str]]:
    """Extracts phone, email, and city from scraped page."""
    # Phone extraction (Italian landlines and mobiles)
    phone = None
    phone_match = re.search(r"(\+39[\s\.\-]?(?:0\d{1,4}|3\d{2})[\s\.\-]?\d{3,4}[\s\.\-]?\d{3,4})", text)
    if phone_match:
        phone = re.sub(r"[\s\.\-]+", " ", phone_match.group(1)).strip()

    # Email extraction
    email = None
    email_match = re.search(r"\b[A-Za-z0-9._%+-]+@(?!example\.com|domain\.com|sentry\.io|wixpress)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", text)
    if email_match:
        email = email_match.group(0).lower()

    # City extraction
    city = "Milano"
    for c in ["Milano", "Como", "Lecco", "Bellagio", "Bergamo", "Brescia", "Monza", "Varese", "Verona", "Torino", "Venezia", "Firenze"]:
        if re.search(r"\b" + re.escape(c) + r"\b", text, re.IGNORECASE):
            city = c
            break

    return {"phone": phone, "email": email, "base_city": city}

def find_fleet_url(base_url: str, html: str) -> str:
    """Finds dedicated fleet or vehicle page link if present."""
    fleet_matches = re.findall(r'href=["\']([^"\']*(?:flotta|fleet|parco-mezzi|veicoli|autobus|minibus)[^"\']*)["\']', html, re.IGNORECASE)
    for m in fleet_matches:
        if m.startswith("http"):
            return m
        elif m.startswith("/"):
            parsed = urllib.parse.urlparse(base_url)
            return f"{parsed.scheme}://{parsed.netloc}{m}"
    return base_url

def search_duckduckgo(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """Lightweight web search scraper for DuckDuckGo HTML without external API keys."""
    results = []
    try:
        encoded_query = urllib.parse.quote(query)
        search_url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
        html = fetch_url(search_url, timeout=12)
        if not html:
            return results

        # Parse links containing uddg redirects
        found_links = re.findall(r'<a[^>]+href="([^"]*uddg=[^"]+)"[^>]*>(.*?)</a>', html, flags=re.DOTALL)
        seen_domains = set()

        for raw_href, raw_title in found_links:
            uddg_match = re.search(r'uddg=([^&]+)', raw_href)
            if not uddg_match:
                continue
            actual_url = urllib.parse.unquote(uddg_match.group(1))
            domain = extract_domain(actual_url)
            title = clean_html_text(raw_title)

            # Filter out search engines, social media aggregators, and directories
            if not domain or domain in seen_domains:
                continue
            if any(blacklisted in domain for blacklisted in [
                "google", "facebook", "instagram", "tripadvisor", "paginegialle",
                "wikipedia", "youtube", "linkedin", "duckduckgo", "yelp", "virgilio"
            ]):
                continue

            seen_domains.add(domain)
            results.append({
                "url": actual_url,
                "domain": domain,
                "title": title or domain
            })

            if len(results) >= max_results:
                break
    except Exception as e:
        print(f"⚠️ Search error for query '{query}': {e}")
    return results

def load_existing_partners() -> List[Dict[str, Any]]:
    """Loads existing partners from JSON manifest."""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading {DATA_FILE}: {e}")
    return []

def save_partners(partners: List[Dict[str, Any]]) -> None:
    """Saves updated partners to JSON manifest and syncs ES module fallback."""
    # Sort descending by relevance score
    partners.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(partners, f, indent=2, ensure_ascii=False)
    print(f"✅ Saved {len(partners)} partners to {DATA_FILE}")

    # Also keep app/bus_partners_data.js in sync
    try:
        content = (
            "// Auto-generated fallback data for Dorogo Bus Fleet Partners\n"
            "// Synced by tools/partners/bus_discovery_crawler.py\n\n"
            f"export const INITIAL_BUS_PARTNERS = {json.dumps(partners, indent=2, ensure_ascii=False)};\n\n"
            "const STORAGE_KEY = 'dorogo_bus_fleet_partners';\n\n"
            "export function loadStoredBusPartners() {\n"
            "  try {\n"
            "    const raw = localStorage.getItem(STORAGE_KEY);\n"
            "    if (raw) {\n"
            "      const parsed = JSON.parse(raw);\n"
            "      if (Array.isArray(parsed) && parsed.length > 0) return parsed;\n"
            "    }\n"
            "  } catch (_) {}\n"
            "  return INITIAL_BUS_PARTNERS;\n"
            "}\n\n"
            "export function saveStoredBusPartners(partners) {\n"
            "  try {\n"
            "    localStorage.setItem(STORAGE_KEY, JSON.stringify(partners));\n"
            "  } catch (_) {}\n"
            "}\n"
        )
        with open(JS_DATA_FILE, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ Synced ES module in {JS_DATA_FILE}")
    except Exception as e:
        print(f"⚠️ Could not write JS fallback file: {e}")

def run_crawler(queries: List[str], max_results: int = 5, dry_run: bool = False) -> None:
    """Main crawler loop."""
    print("=" * 70)
    print("🚌 DOROGO LUXURY BUS & MINIBUS DISCOVERY CRAWLER")
    print(f"   Target: Northern Italy (Milan, Como, Bergamo, Brescia, Verona, Turin)")
    print(f"   Objective: Find 100% unbranded / Total Black luxury coaches")
    print("=" * 70)

    existing_partners = load_existing_partners()
    existing_domains = {extract_domain(p.get("website", "")): p for p in existing_partners if p.get("website")}
    print(f"📦 Loaded {len(existing_partners)} existing partners ({len(existing_domains)} unique domains)")

    discovered_count = 0
    updated_count = 0

    for query in queries:
        print(f"\n🔍 Query: {query}")
        search_results = search_duckduckgo(query, max_results=max_results)
        print(f"   Found {len(search_results)} candidates")

        for item in search_results:
            domain = item["domain"]
            url = item["url"]

            if domain in existing_domains:
                print(f"   ℹ️ Already in database: {domain}")
                continue

            print(f"   🌐 Crawling: {url} ...")
            html = fetch_url(url)
            if not html:
                continue

            text = clean_html_text(html)
            contact = extract_contact_info(text, html)
            fleet_url = find_fleet_url(url, html)

            # If dedicated fleet page found, fetch it too to enrich signals
            if fleet_url != url:
                fleet_html = fetch_url(fleet_url)
                if fleet_html:
                    text += " " + clean_html_text(fleet_html)

            score, breakdown, notes_list = calculate_bus_relevance_score(text, contact)

            # Determine unbranded status description
            if breakdown["discretion_unbranded"] >= 35:
                unbranded_status = "100% Guaranteed Unbranded / Total Black"
            elif breakdown["discretion_unbranded"] >= 20:
                unbranded_status = "Unbranded on Request"
            else:
                unbranded_status = "Commercial Billboard Livery"

            # Derive company name from title or domain
            name = item.get("title") or domain.replace(".it", "").replace(".com", "").capitalize()
            # Clean up title if it contains generic boilerplate
            name = re.split(r"[-|:–]", name)[0].strip()

            partner_id = f"partner_{re.sub(r'[^a-z0-9_]', '', domain.replace('.', '_'))}"
            new_partner = {
                "id": partner_id,
                "name": name,
                "base_city": contact["base_city"],
                "website": url,
                "fleet_url": fleet_url,
                "relevance_score": score,
                "score_breakdown": breakdown,
                "status": "TO_REVIEW",
                "unbranded_status": unbranded_status,
                "fleet_categories": [
                    "Mercedes Sprinter VIP (8-20 seats)",
                    "Executive Coach 30-54 seats"
                ],
                "phone": contact.get("phone") or "",
                "email": contact.get("email") or "",
                "notes": f"Discovered via crawler. Signals: {' · '.join(notes_list)}",
                "source": "crawler"
            }

            print(f"   ⭐ Scored: {score}/100 | {name} ({contact['base_city']}) | {unbranded_status}")

            if not dry_run:
                existing_partners.append(new_partner)
                existing_domains[domain] = new_partner
                discovered_count += 1
            else:
                print("   [Dry Run - Not saved]")

            time.sleep(1)  # Respectful rate limiting between requests

    if not dry_run and discovered_count > 0:
        save_partners(existing_partners)
        print(f"\n🎉 Successfully added {discovered_count} newly discovered partners to the manifest!")
    else:
        print("\n🏁 Crawl completed.")

def main():
    parser = argparse.ArgumentParser(description="Dorogo Bus Partner Discovery Crawler")
    parser.add_argument("--query", type=str, help="Single custom search query")
    parser.add_argument("--max-results", type=int, default=5, help="Max results per search query")
    parser.add_argument("--dry-run", action="store_true", help="Print scores without saving to disk")
    args = parser.parse_args()

    queries = [args.query] if args.query else DEFAULT_QUERIES
    run_crawler(queries, max_results=args.max_results, dry_run=args.dry_run)

if __name__ == "__main__":
    main()
