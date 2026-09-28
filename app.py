"""
AuraTrace Demo Target Application for Autonomous Healing Verification.
"""

def get_user_name(data):
    """Extract user name from dictionary payload."""
    return ((data or {}).get('user') or {}).get('name')
