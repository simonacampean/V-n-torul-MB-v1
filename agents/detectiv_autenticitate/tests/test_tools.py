"""Teste pentru partea fără apel API — regex_vin_matcher e pur Python,
testabil izolat, fără cheie Anthropic."""

import unittest

from ..tools import regex_vin_matcher


class TestRegexVinMatcher(unittest.TestCase):
    def test_vin_iso_standard(self):
        text = "VIN: WDB1240501A123456, restul detaliilor..."
        result = regex_vin_matcher(text)
        self.assertIn("WDB1240501A123456", result["vin_iso"])

    def test_mercedes_chassis_code(self):
        text = "Cod șasiu 124.023-12-345678, motor sănătos."
        result = regex_vin_matcher(text)
        self.assertIn("124.023-12-345678", result["mercedes_chassis_code"])

    def test_labeled_engine_number_german(self):
        text = "Motornummer: 110988-12-004567, matching numbers confirmat."
        result = regex_vin_matcher(text)
        self.assertIn("110988-12-004567", result["labeled_engine_number"])

    def test_labeled_chassis_number_english(self):
        text = "Chassis number: 123.020-10-987654 verified by marque specialist."
        result = regex_vin_matcher(text)
        self.assertIn("123.020-10-987654", result["labeled_chassis_number"])

    def test_text_fara_coduri_intoarce_liste_goale(self):
        result = regex_vin_matcher("Mașină frumoasă, fără detalii tehnice specifice.")
        self.assertEqual(result["vin_iso"], [])
        self.assertEqual(result["mercedes_chassis_code"], [])
        self.assertEqual(result["labeled_chassis_number"], [])
        self.assertEqual(result["labeled_engine_number"], [])

    def test_gaseste_ambele_coduri_in_acelasi_text(self):
        text = "Fahrgestellnummer: XYZ987654321, Motornummer: 110988-12-004567."
        result = regex_vin_matcher(text)
        self.assertTrue(len(result["labeled_chassis_number"]) >= 1)
        self.assertTrue(len(result["labeled_engine_number"]) >= 1)


if __name__ == "__main__":
    unittest.main()
