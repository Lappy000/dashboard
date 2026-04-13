"""
Step 5: Telegram bot for high-value order notifications.
Monitors Supabase for orders with total > 50,000 KZT.

Usage:
    pip install -r requirements.txt
    python telegram_bot.py
"""

import json
import os
import sys
import time
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

THRESHOLD_AMOUNT: float = 50000.0
POLL_INTERVAL_SECONDS: int = 30


def send_telegram_message(chat_id: str, text: str) -> bool:
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    try:
        resp = requests.post(url, json=payload, timeout=10)
        data = resp.json()
        if data.get("ok"):
            print(f"[+] Message sent to chat {chat_id}")
            return True
        else:
            print(f"[-] Telegram error: {data.get('description', 'Unknown')}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"[-] Request error: {e}")
        return False


def get_chat_id() -> Optional[str]:
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates"
    try:
        resp = requests.get(url, timeout=10)
        data = resp.json()
        if data.get("ok") and data.get("result"):
            for update in data["result"]:
                msg = update.get("message", {})
                chat = msg.get("chat", {})
                chat_id = chat.get("id")
                if chat_id:
                    return str(chat_id)
    except requests.exceptions.RequestException as e:
        print(f"[-] Error getting updates: {e}")
    return None


def format_order_alert(order: Dict[str, Any]) -> str:
    items_str = ""
    try:
        items = json.loads(order.get("items", "[]")) if isinstance(order.get("items"), str) else order.get("items", [])
        for item in items:
            name = item.get("productName", "Unknown")
            qty = item.get("quantity", 1)
            price = item.get("initialPrice", 0)
            items_str += f"  - {name} x{qty} ({price:,.0f} KZT)\n"
    except (json.JSONDecodeError, TypeError):
        items_str = "  (unable to parse items)\n"

    total = float(order.get("total_amount", 0))
    city = order.get("city", "N/A")
    name = f"{order.get('first_name', '')} {order.get('last_name', '')}".strip()
    utm = order.get("utm_source", "N/A")

    return (
        f"<b>NEW HIGH-VALUE ORDER!</b>\n\n"
        f"Customer: {name}\n"
        f"City: {city}\n"
        f"Total: <b>{total:,.0f} KZT</b>\n"
        f"UTM: {utm}\n\n"
        f"Items:\n{items_str}\n"
        f"Order ID: {order.get('retailcrm_id', 'N/A')}"
    )


def check_high_value_orders(supabase_client: Client, last_check_id: int) -> List[Dict[str, Any]]:
    try:
        result = (
            supabase_client.table("orders")
            .select("*")
            .gt("id", last_check_id)
            .gte("total_amount", THRESHOLD_AMOUNT)
            .order("id", desc=False)
            .execute()
        )
        return result.data if result.data else []
    except Exception as e:
        print(f"[-] Supabase query error: {e}")
        return []


def get_max_order_id(supabase_client: Client) -> int:
    try:
        result = (
            supabase_client.table("orders")
            .select("id")
            .order("id", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]["id"]
    except Exception as e:
        print(f"[-] Error getting max ID: {e}")
    return 0


def run_one_time_check(supabase_client: Client, chat_id: str) -> None:
    print("[*] Running one-time check for existing high-value orders...")
    try:
        result = (
            supabase_client.table("orders")
            .select("*")
            .gte("total_amount", THRESHOLD_AMOUNT)
            .order("total_amount", desc=True)
            .execute()
        )
        orders = result.data if result.data else []
        print(f"[*] Found {len(orders)} orders >= {THRESHOLD_AMOUNT:,.0f} KZT")

        for order in orders:
            msg = format_order_alert(order)
            send_telegram_message(chat_id, msg)
            time.sleep(1)

        if orders:
            print(f"[+] Sent {len(orders)} alerts to Telegram")
        else:
            send_telegram_message(chat_id, f"No orders above {THRESHOLD_AMOUNT:,.0f} KZT found.")
    except Exception as e:
        print(f"[-] Error: {e}")


def main() -> None:
    if not TELEGRAM_BOT_TOKEN:
        print("[-] Error: TELEGRAM_BOT_TOKEN must be set in .env")
        sys.exit(1)

    chat_id = TELEGRAM_CHAT_ID

    if not chat_id:
        print("[*] TELEGRAM_CHAT_ID not set. Attempting to detect...")
        print("[*] Send /start to your bot first, then press Enter here.")
        input()
        chat_id = get_chat_id()
        if chat_id:
            print(f"[+] Detected chat_id: {chat_id}")
            print(f"[*] Add this to your .env: TELEGRAM_CHAT_ID={chat_id}")
        else:
            print("[-] Could not detect chat_id. Send a message to your bot and try again.")
            sys.exit(1)

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("[-] Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        sys.exit(1)

    supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    send_telegram_message(chat_id, "GBC Analytics Bot started! Monitoring orders > 50,000 KZT.")
    run_one_time_check(supabase_client, chat_id)

    print(f"\n[*] Starting polling loop (every {POLL_INTERVAL_SECONDS}s)...")
    last_id = get_max_order_id(supabase_client)
    print(f"[*] Current max order ID: {last_id}")

    while True:
        try:
            time.sleep(POLL_INTERVAL_SECONDS)
            new_orders = check_high_value_orders(supabase_client, last_id)
            if new_orders:
                print(f"[+] Found {len(new_orders)} new high-value orders!")
                for order in new_orders:
                    msg = format_order_alert(order)
                    send_telegram_message(chat_id, msg)
                    new_id = order.get("id", last_id)
                    if new_id > last_id:
                        last_id = new_id
                    time.sleep(0.5)
        except KeyboardInterrupt:
            print("\n[*] Bot stopped by user.")
            send_telegram_message(chat_id, "GBC Analytics Bot stopped.")
            break
        except Exception as e:
            print(f"[-] Polling error: {e}")
            time.sleep(5)


if __name__ == "__main__":
    main()
