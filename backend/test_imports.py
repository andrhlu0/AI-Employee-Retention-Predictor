#!/usr/bin/env python
"""
Test script to debug import issues
Run this to see which packages are actually available
"""

import sys
import importlib

def test_import(module_name, package_name=None):
    """Test if a module can be imported"""
    try:
        importlib.import_module(module_name)
        print(f"✅ {package_name or module_name}: OK")
        return True
    except ImportError as e:
        print(f"❌ {package_name or module_name}: FAILED - {e}")
        return False

print("=" * 60)
print("Testing Package Imports")
print("=" * 60)
print()

# Test each package with its correct import name
packages = [
    ('fastapi', 'fastapi'),
    ('uvicorn', 'uvicorn'),
    ('sqlalchemy', 'sqlalchemy'),
    ('passlib', 'passlib'),
    ('jose', 'python-jose'),
    ('pydantic', 'pydantic'),
    ('pydantic_settings', 'pydantic-settings'),
    ('pandas', 'pandas'),
    ('numpy', 'numpy'),
    ('sklearn', 'scikit-learn'),
    ('xgboost', 'xgboost'),
    ('email_validator', 'email-validator'),
    ('bcrypt', 'bcrypt'),
    ('dotenv', 'python-dotenv')
]

all_good = True
for import_name, package_name in packages:
    if not test_import(import_name, package_name):
        all_good = False

print()
print("=" * 60)
if all_good:
    print("✅ All required packages are installed correctly!")
    print("\nYou can now run:")
    print("  python run_app.py")
    print("\nOr directly:")
    print("  python app.py")
else:
    print("❌ Some packages are missing or incorrectly installed")
    print("\nTry reinstalling:")
    print("  pip install --force-reinstall -r requirements.txt")
    
print("=" * 60)

# Also check Python version
print(f"\nPython version: {sys.version}")
print(f"Python executable: {sys.executable}")

# Check if we're in a virtual environment
if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
    print("✅ Running in a virtual environment")
else:
    print("⚠️  Not running in a virtual environment")