"""Pure order transformation tests with configuration/network replaced at import."""

import importlib.util
import json
import os
import sys
import unittest
from pathlib import Path
from types import ModuleType
from unittest.mock import Mock, patch


def load_sync():
    requests = ModuleType("requests")
    requests.get = Mock(side_effect=AssertionError("Network forbidden"))
    dotenv = ModuleType("dotenv")
    dotenv.load_dotenv = Mock()
    supabase = ModuleType("supabase")
    supabase.Client = object
    supabase.create_client = Mock(return_value=object())
    path = Path(__file__).resolve().parents[1] / "scripts" / "sync_retailcrm_to_supabase.py"
    spec = importlib.util.spec_from_file_location("sync_under_test", path)
    module = importlib.util.module_from_spec(spec)
    env = {
        "RETAILCRM_URL": "https://crm.example.invalid", "RETAILCRM_API_KEY": "offline-test",
        "SUPABASE_URL": "https://db.example.invalid", "SUPABASE_SERVICE_KEY": "offline-test",
    }
    with (
        patch.dict(sys.modules, requests=requests, dotenv=dotenv, supabase=supabase),
        patch.dict(os.environ, env, clear=True),
    ):
        spec.loader.exec_module(module)
    return module


class OrderTotalsTests(unittest.TestCase):
    def test_fractional_quantity_is_not_truncated(self):
        sync = load_sync()
        self.assertEqual(sync.calculate_total({
            "items": [{"initialPrice": 100, "quantity": 1.5}]
        }), 150)

    def test_explicit_zero_price_does_not_fall_back_to_list_price(self):
        sync = load_sync()
        self.assertEqual(sync.calculate_total({
            "items": [{"initialPrice": 0, "price": 100, "quantity": 2}]
        }), 0)

    def test_missing_price_falls_back_without_losing_fractional_quantity(self):
        sync = load_sync()
        self.assertEqual(sync.calculate_total({
            "items": [{"price": "100", "quantity": "1.5"}]
        }), 150)

    def test_transformed_item_price_matches_fallback_used_in_total(self):
        sync = load_sync()
        row = sync.transform_order({
            "id": "synthetic-order",
            "items": [{"price": "100", "quantity": 1.5}],
        })
        items = json.loads(row["items"])
        self.assertEqual(items[0]["initialPrice"], 100)
        self.assertEqual(items[0]["quantity"], 1.5)
        self.assertEqual(row["total_amount"], 150)

    def test_transformed_item_and_total_use_the_same_price_precedence(self):
        for initial_price, expected in [(None, 100), ("", 100), (0, 0), ("0", 0), ("25.5", 25.5)]:
            with self.subTest(initial_price=initial_price):
                row = load_sync().transform_order({
                    "items": [{"initialPrice": initial_price, "price": 100, "quantity": 2}],
                })
                item = json.loads(row["items"])[0]
                self.assertEqual(item["initialPrice"], expected)
                self.assertEqual(row["total_amount"], expected * 2)

    def test_empty_order_total_is_zero(self):
        self.assertEqual(load_sync().calculate_total({}), 0)


if __name__ == "__main__":
    unittest.main()
