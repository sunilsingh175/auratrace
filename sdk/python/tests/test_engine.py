import unittest

from auratrace.engine import EmbeddedDiagnosticEngine


class TestPatchGeneration(unittest.TestCase):
    def setUp(self):
        self.engine = EmbeddedDiagnosticEngine()

    def test_generic_exception_does_not_generate_incomplete_try_block(self):
        patch = self.engine._generate_patch(
            failing_file="app.py",
            failing_line=10,
            failing_code='raise ValueError("Invalid payment payload amount")',
            err_type="ValueError",
            err_msg="Invalid payment payload amount",
        )

        self.assertEqual(patch, "")


if __name__ == "__main__":
    unittest.main()
