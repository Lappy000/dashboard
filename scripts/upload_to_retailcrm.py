"""
Step 2: Upload mock_orders.json to RetailCRM via API.

Usage:
    pip install -r requirements.txt
    python upload_to_retailcrm.py

Requires .env with RETAILCRM_URL and RETAILCRM_API_KEY set.
"""

import json
import os
import sys
import time
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

RETAILCRM_URL: str = os.getenv("RETAILCRM_URL", "")
RETAILCRM_API_KEY: str = os.getenv("RETAILCRM_API_KEY", "")

if not RETAILCRM_URL or not RETAILCRM_API_KEY:
    print("[-] Error: RETAILCRM_URL and RETAILCRM_API_KEY must be set in .env")
    sys.exit(1)


def create_order(order_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a single order in RetailCRM via API v5."""
    url = f"{RETAILCRM_URL}/api/v5/orders/create"

    # Build order payload for RetailCRM API format
    order_payload: Dict[str, Any] = {
        "firstName": order_data.get("firstName", ""),
        "lastName": order_data.get("lastName", ""),
        "phone": order_data.get("phone", ""),
        "email": order_data.get("email", ""),
        "orderType": order_data.get("orderType", "eshop-individual"),
        "orderMethod": order_data.get("orderMethod", "shopping-cart"),
        "status": order_data.get("status", "new"),
        "items": [],
        "delivery": order_data.get("delivery", {}),
        "customFields": order_data.get("customFields", {}),
    }

    # Add items
    for item in order_data.get("items", []):
        order_payload["items"].append(
            {
                "productName": item.get("productName", ""),
                "quantity": item.get("quantity", 1),
                "initialPrice": item.get("initialPrice", 0),
            }
        )

    payload = {
        "apiKey": RETAILCRM_API_KEY,
        "order": json.dumps(order_payload),
    }

    try:
        resp = requests.post(url, data=payload, timeout=30)
        result = resp.json()

        if result.get("success"):
            order_id = result.get("id", "unknown")
            print(f"[+] Order created: ID={order_id} | {order_data['firstName']} {order_data['lastName']}")
            return result
        else:
            errors = result.get("errors", result.get("errorMsg", "Unknown error"))
            print(f"[-] Failed to create order for {order_data['firstName']}: {errors}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"[-] Request error for {order_data['firstName']}: {e}")
        return None


def main() -> None:
    """Load mock_orders.json and upload all orders to RetailCRM."""
    orders_file = os.path.join(os.path.dirname(__file__), "..", "mock_orders.json")

    with open(orders_file, "r", encoding="utf-8") as f:
        orders: List[Dict[str, Any]] = json.load(f)

    print(f"[*] Loaded {len(orders)} orders from mock_orders.json")
    print(f"[*] Uploading to RetailCRM: {RETAILCRM_URL}")
    print()

    success_count = 0
    fail_count = 0

    for i, order in enumerate(orders, 1):
        print(f"[*] Processing order {i}/{len(orders)}...")
        result = create_order(order)
        if result:
            success_count += 1
        else:
            fail_count += 1

        # Rate limit: avoid hammering the API
        time.sleep(0.5)

    print()
    print(f"[+] Upload complete: {success_count} success, {fail_count} failed out of {len(orders)} orders")


if __name__ == "__main__":
    main()
