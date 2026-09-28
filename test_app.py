import pytest
from app import get_user_name


def test_get_user_name_valid():
    assert get_user_name({"user": {"name": "Alice"}}) == "Alice"


def test_get_user_name_none():
    assert get_user_name(None) is None


def test_get_user_name_empty():
    assert get_user_name({}) is None
