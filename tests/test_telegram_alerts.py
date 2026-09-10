"""Offline regression tests: external integrations are never initialized."""

import importlib.util
import sys
import unittest
from pathlib import Path
from types import ModuleType
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]


def load_script(name):
    requests = ModuleType("requests")
    requests.get = Mock(side_effect=AssertionError("Network forbidden in tests"))
    requests.post = Mock(side_effect=AssertionError("Network forbidden in tests"))
    dotenv = ModuleType("dotenv")
    dotenv.load_dotenv = Mock()  # Never read a real .env file.
    supabase = ModuleType("supabase")
    supabase.Client = object
    supabase.create_client = Mock(side_effect=AssertionError("Production client forbidden"))
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    with patch.dict(sys.modules, requests=requests, dotenv=dotenv, supabase=supabase):
        spec.loader.exec_module(module)
    return module


class TelegramAlertTests(unittest.TestCase):
    def test_order_fields_are_escaped_for_telegram_html(self):
        bot = load_script("telegram_bot")
        text = bot.format_order_alert({
            "first_name": "<b>Ada</b>", "last_name": "A & B", "city": "<Town>",
            "utm_source": '<a href="https://example.invalid">promo</a>',
            "retailcrm_id": "<42>", "total_amount": 60000,
            "items": [{"productName": "Tea & <Coffee>", "quantity": 2, "initialPrice": 30000}],
        })
        self.assertIn("&lt;b&gt;Ada&lt;/b&gt; A &amp; B", text)
        self.assertIn("&lt;Town&gt;", text)
        self.assertIn("Tea &amp; &lt;Coffee&gt;", text)
        self.assertIn("Order ID: &lt;42&gt;", text)
        self.assertNotIn('<a href=', text)
        self.assertIn("<b>60,000 KZT</b>", text)

    def test_json_items_escape_quantity_and_preserve_unicode(self):
        bot = load_script("telegram_bot")
        text = bot.format_order_alert({
            "first_name": "Амир", "total_amount": 50000,
            "items": '[{"productName": "чай", "quantity": "<b>2</b>", "initialPrice": 25000}]',
        })
        self.assertIn("Амир", text)
        self.assertIn("чай x&lt;b&gt;2&lt;/b&gt;", text)


if __name__ == "__main__":
    unittest.main()
