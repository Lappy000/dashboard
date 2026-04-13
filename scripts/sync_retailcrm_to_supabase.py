"""
Step 3: Sync orders from RetailCRM to Supabase.

Usage:
    pip install -r requirements.txt
    python sync_retailcrm_to_supabase.py

Requires .env with RETAILCRM_URL, RETAILCRM_API_KEY,
SUPABASE_URL, and SUPABASE_SERVICE_KEY set.
"""

import json
import os
import sys
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

RETAILCRM_URL: str = os.getenv("RETAILCRM_URL", "")
RETAILCRM_API_KEY: str = os.getenv("RETAILCRM_API_KEY", "")
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

if not all([RETAILCRM_URL, RETAILCRM_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY]):
    print("[-] Error: All env vars must be set (RETAILCRM_URL, RETAILCRM_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY)")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def fetch_orders_from_retailcrm(page: int = 1, limit: int = 100) -> List[Dict[str, Any]]:
    """Fetch orders from RetailCRM API v5."""
    url = f"{RETAILCRM_URL}/api/v5/orders"
    params = {
        "apiKey": RETAILCRM_API_KEY,
        "page": page,
        "limit": limit,
    }

    all_orders: List[Dict[str, Any]] = []

    try:
        while True:
            resp = requests.get(url, params=params, timeout=30)
            data = resp.json()

            if not data.get("success"):
                print(f"[-] RetailCRM API error: {data.get('errorMsg', 'Unknown')}")
                break

            orders = data.get("orders", [])
            all_orders.extend(orders)

            pagination = data.get("pagination", {})
            total_pages = pagination.get("totalPageCount", 1)
            current_page = pagination.get("currentPage", 1)

            print(f"[*] Fetched page {current_page}/{total_pages} ({len(orders)} orders)")

            if current_page >= total_pages:
                break

            params["page"] = current_page + 1

    except requests.exceptions.RequestException as e:
        print(f"[-] Request error: {e}")

    return all_orders


def calculate_total(order: Dict[str, Any]) -> float:
    """Calculate total order amount from items."""
    total = 0.0
    for item in order.get("items", []):
        price = float(item.get("initialPrice", 0) or item.get("price", 0) or 0)
        qty = int(item.get("quantity", 1))
        total += price * qty
    return total


def transform_order(order: Dict[str, Any]) -> Dict[str, Any]:
    """Transform RetailCRM order to Supabase row format."""
    delivery = order.get("delivery", {})
    address_obj = delivery.get("address", {})
    city = address_obj.get("city", "")
    address_text = address_obj.get("text", "")

    items_raw = order.get("items", [])
    items_clean = []
    for item in items_raw:
        items_clean.append({
            "productName": item.get("offer", {}).get("displayName", item.get("productName", "")),
            "quantity": item.get("quantity", 1),
            "initialPrice": float(item.get("initialPrice", 0) or 0),
        })

    custom_fields = order.get("customFields", {})
    utm_source = custom_fields.get("utm_source", "")

    return {
        "retailcrm_id": str(order.get("id", "")),
        "first_name": order.get("firstName", ""),
        "last_name": order.get("lastName", ""),
        "phone": order.get("phone", ""),
        "email": order.get("email", ""),
        "status": order.get("status", "new"),
        "city": city,
        "address": address_text,
        "total_amount": calculate_total(order),
        "items": json.dumps(items_clean, ensure_ascii=False),
        "utm_source": utm_source,
        "created_at": order.get("createdAt", None),
    }


def upsert_orders_to_supabase(orders: List[Dict[str, Any]]) -> int:
    """Upsert transformed orders into Supabase."""
    success_count = 0

    for order in orders:
        try:
            result = supabase.table("orders").upsert(
                order, on_conflict="retailcrm_id"
            ).execute()
            success_count += 1
        except Exception as e:
            print(f"[-] Supabase upsert error for order {order.get('retailcrm_id')}: {e}")

    return success_count


def main() -> None:
    """Main sync flow: RetailCRM -> Supabase."""
    print("[*] Starting RetailCRM -> Supabase sync...")
    print()

    # Fetch from RetailCRM
    orders = fetch_orders_from_retailcrm()
    print(f"\n[+] Total orders fetched from RetailCRM: {len(orders)}")

    if not orders:
        print("[-] No orders to sync. Exiting.")
        return

    # Transform
    print("[*] Transforming orders...")
    transformed = [transform_order(o) for o in orders]

    # Upsert to Supabase
    print("[*] Upserting to Supabase...")
    count = upsert_orders_to_supabase(transformed)
    print(f"\n[+] Sync complete: {count}/{len(transformed)} orders upserted to Supabase")


if __name__ == "__main__":
    main()
