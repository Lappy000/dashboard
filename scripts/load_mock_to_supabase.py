"""
Quick Setup: Load mock_orders.json directly into Supabase.
Bypasses RetailCRM and loads mock data directly for dashboard testing.

Usage:
    pip install -r requirements.txt
    python load_mock_to_supabase.py
"""

import json
import os
import sys
import random
from datetime import datetime, timedelta
from typing import Any, Dict, List

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("[-] Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def calculate_total(items: List[Dict[str, Any]]) -> float:
    total = 0.0
    for item in items:
        price = float(item.get("initialPrice", 0))
        qty = int(item.get("quantity", 1))
        total += price * qty
    return total


def main() -> None:
    orders_file = os.path.join(os.path.dirname(__file__), "..", "mock_orders.json")

    with open(orders_file, "r", encoding="utf-8") as f:
        orders: List[Dict[str, Any]] = json.load(f)

    print(f"[*] Loaded {len(orders)} orders from mock_orders.json")
    print(f"[*] Target Supabase: {SUPABASE_URL}")

    base_date = datetime.now()
    rows = []

    for i, order in enumerate(orders):
        days_ago = random.randint(0, 30)
        hours_ago = random.randint(0, 23)
        created = base_date - timedelta(days=days_ago, hours=hours_ago)

        delivery = order.get("delivery", {})
        address_obj = delivery.get("address", {})

        items_data = order.get("items", [])
        items_clean = []
        for item in items_data:
            items_clean.append({
                "productName": item.get("productName", ""),
                "quantity": item.get("quantity", 1),
                "initialPrice": float(item.get("initialPrice", 0)),
            })

        row = {
            "retailcrm_id": f"mock-{i + 1}",
            "first_name": order.get("firstName", ""),
            "last_name": order.get("lastName", ""),
            "phone": order.get("phone", ""),
            "email": order.get("email", ""),
            "status": order.get("status", "new"),
            "city": address_obj.get("city", ""),
            "address": address_obj.get("text", ""),
            "total_amount": calculate_total(items_data),
            "items": json.dumps(items_clean, ensure_ascii=False),
            "utm_source": order.get("customFields", {}).get("utm_source", ""),
            "created_at": created.isoformat(),
        }
        rows.append(row)

    print("[*] Upserting orders to Supabase...")
    try:
        result = supabase.table("orders").upsert(rows, on_conflict="retailcrm_id").execute()
        print(f"[+] Successfully loaded {len(rows)} orders into Supabase!")
    except Exception as e:
        print(f"[-] Batch error: {e}")
        print("[*] Trying one by one...")
        success = 0
        for row in rows:
            try:
                supabase.table("orders").upsert(row, on_conflict="retailcrm_id").execute()
                success += 1
            except Exception as e2:
                print(f"[-] Failed order {row['retailcrm_id']}: {e2}")
        print(f"[+] Loaded {success}/{len(rows)} orders")

    totals = [r["total_amount"] for r in rows]
    print(f"\n=== Summary ===")
    print(f"  Total orders: {len(rows)}")
    print(f"  Total revenue: {sum(totals):,.0f} KZT")
    print(f"  Avg order value: {sum(totals) / len(totals):,.0f} KZT")
    high_value = [t for t in totals if t > 50000]
    print(f"  Orders > 50,000 KZT: {len(high_value)}")


if __name__ == "__main__":
    main()
