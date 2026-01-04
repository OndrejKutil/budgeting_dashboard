#!/usr/bin/env python
"""
Backend API Test Runner

A wrapper script to run the backend API tests with dependency checking
and user-friendly output.

Usage:
    python main.py                  # Run all tests
    python main.py -v               # Verbose output
    python main.py -k "login"       # Run only tests matching "login"
    python main.py --quick          # Skip slow tests
    python main.py --install        # Install dependencies first
"""

import subprocess
import sys
import os
from pathlib import Path


# ================================================================================================
#                                   Configuration
# ================================================================================================

REQUIRED_PACKAGES = [
    "requests",
    "pytest", 
    "python-dotenv",
]

SCRIPT_DIR = Path(__file__).parent
ENV_FILE = SCRIPT_DIR / ".env"
TEST_FILE = SCRIPT_DIR / "test_backend.py"


# ================================================================================================
#                                   Dependency Checking
# ================================================================================================

def check_package_installed(package_name: str) -> bool:
    """Check if a Python package is installed."""
    try:
        __import__(package_name.replace("-", "_"))
        return True
    except ImportError:
        return False


def check_all_dependencies() -> tuple[bool, list[str]]:
    """
    Check if all required packages are installed.
    Returns (all_installed, list_of_missing_packages)
    """
    missing = []
    for package in REQUIRED_PACKAGES:
        # Handle package names that differ from import names
        import_name = package.replace("-", "_")
        if import_name == "python_dotenv":
            import_name = "dotenv"
        
        if not check_package_installed(import_name):
            missing.append(package)
    
    return len(missing) == 0, missing


def install_dependencies() -> bool:
    """Install required dependencies using pip."""
    print("📦 Installing dependencies...")
    
    requirements_file = SCRIPT_DIR / "requirements.txt"
    
    if requirements_file.exists():
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)],
            capture_output=True,
            text=True
        )
    else:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install"] + REQUIRED_PACKAGES,
            capture_output=True,
            text=True
        )
    
    if result.returncode == 0:
        print("✅ Dependencies installed successfully!")
        return True
    else:
        print(f"❌ Failed to install dependencies:")
        print(result.stderr)
        return False


# ================================================================================================
#                                   Environment Validation
# ================================================================================================

def check_env_file() -> tuple[bool, list[str]]:
    """
    Check if .env file exists and has required variables.
    Returns (is_valid, list_of_missing_variables)
    """
    required_vars = [
        "TEST_API_KEY",
        "TEST_EMAIL", 
        "TEST_PASSWORD",
    ]
    
    if not ENV_FILE.exists():
        return False, ["[.env file not found]"]
    
    # Read .env file
    env_content = ENV_FILE.read_text()
    env_vars = {}
    for line in env_content.splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key = line.split("=", 1)[0].strip()
            env_vars[key] = True
    
    missing = [var for var in required_vars if var not in env_vars]
    return len(missing) == 0, missing


# ================================================================================================
#                                   Test Runner
# ================================================================================================

def run_tests(args: list[str]) -> int:
    """Run pytest with the given arguments."""
    pytest_args = [sys.executable, "-m", "pytest", str(TEST_FILE)]
    
    # Add default arguments if none provided
    if not any(arg.startswith("-") for arg in args):
        pytest_args.append("-v")  # Verbose by default
    
    pytest_args.extend(args)
    
    print(f"\n🧪 Running tests...")
    print(f"   Command: pytest {' '.join(args if args else ['-v'])}\n")
    print("=" * 70)
    
    result = subprocess.run(pytest_args)
    return result.returncode


def print_header():
    """Print a nice header."""
    print()
    print("=" * 70)
    print("   🏦 Budgeting Dashboard - Backend API Test Suite")
    print("=" * 70)
    print()


def print_help():
    """Print usage help."""
    print("""
Usage: python main.py [OPTIONS] [PYTEST_ARGS]

Options:
    --install       Install dependencies before running tests
    --check         Only check dependencies and environment, don't run tests
    --help, -h      Show this help message

Pytest Arguments (passed through):
    -v              Verbose output
    -vv             More verbose output  
    -k PATTERN      Run tests matching PATTERN
                    Examples: -k "login"
                              -k "transactions"
                              -k "not slow"
    -x              Stop on first failure
    --tb=short      Shorter tracebacks
    --tb=no         No tracebacks
    -s              Show print statements

Examples:
    python main.py                      # Run all tests (verbose)
    python main.py --install            # Install deps, then run tests
    python main.py -k "auth"            # Run only auth tests
    python main.py -k "monthly"         # Run monthly analytics tests
    python main.py -x --tb=short        # Stop on first failure, short output
    python main.py --check              # Just check environment
""")


# ================================================================================================
#                                   Main Entry Point
# ================================================================================================

def main():
    """Main entry point."""
    args = sys.argv[1:]
    
    # Handle help
    if "--help" in args or "-h" in args:
        print_help()
        return 0
    
    print_header()
    
    # Check if --install flag is present
    should_install = "--install" in args
    if should_install:
        args.remove("--install")
    
    # Check if --check flag is present
    check_only = "--check" in args
    if check_only:
        args.remove("--check")
    
    # Step 1: Check dependencies
    print("📋 Checking dependencies...")
    deps_ok, missing_deps = check_all_dependencies()
    
    if not deps_ok:
        print(f"   ⚠️  Missing packages: {', '.join(missing_deps)}")
        
        if should_install:
            if not install_dependencies():
                return 1
            # Re-check after installation
            deps_ok, missing_deps = check_all_dependencies()
            if not deps_ok:
                print(f"   ❌ Still missing: {', '.join(missing_deps)}")
                return 1
        else:
            print("   💡 Run with --install to install dependencies")
            print(f"   💡 Or manually: pip install {' '.join(missing_deps)}")
            return 1
    else:
        print("   ✅ All dependencies installed")
    
    # Step 2: Check .env file
    print("\n📋 Checking environment configuration...")
    env_ok, missing_vars = check_env_file()
    
    if not env_ok:
        print(f"   ❌ Missing environment variables: {', '.join(missing_vars)}")
        print(f"   💡 Please check your .env file at: {ENV_FILE}")
        return 1
    else:
        print("   ✅ Environment configured")
    
    # Step 3: Check test file exists
    print("\n📋 Checking test file...")
    if not TEST_FILE.exists():
        print(f"   ❌ Test file not found: {TEST_FILE}")
        return 1
    else:
        print(f"   ✅ Test file found: {TEST_FILE.name}")
    
    # If check only, stop here
    if check_only:
        print("\n✅ All checks passed! Ready to run tests.")
        print("   Run without --check to execute tests.")
        return 0
    
    # Step 4: Run tests
    return run_tests(args)


if __name__ == "__main__":
    sys.exit(main())
