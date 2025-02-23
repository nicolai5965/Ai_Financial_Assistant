"""System and dependency validation utilities."""
import sys
import subprocess
import os
from typing import Tuple

def check_python_version() -> Tuple[bool, str]:
    """Check and return the Python version status.
    
    Returns:
        Tuple[bool, str]: Success status and version information
    """
    try:
        python_version = sys.version
        return True, f"Python is running! Version: {python_version}"
    except Exception as e:
        return False, f"Error checking Python version: {str(e)}"

def check_requirements() -> Tuple[bool, str]:
    """Check installed packages and update requirements.txt if necessary.
    
    Returns:
        Tuple[bool, str]: Success status and result message
    """
    package_file = "requirements.txt"

    try:
        # Get currently installed packages
        result = subprocess.run(["pip", "freeze"], capture_output=True, text=True, check=True)
        installed_packages = result.stdout.strip()

        # Read existing requirements.txt (if it exists)
        if os.path.exists(package_file):
            with open(package_file, "r", encoding="utf-8") as file:
                existing_packages = file.read().strip()
        else:
            existing_packages = ""

        # Compare before writing to avoid unnecessary changes
        if installed_packages != existing_packages:
            with open(package_file, "w", encoding="utf-8") as file:
                file.write(installed_packages)
            return True, f"Package list updated in {package_file} (changes detected)."
        
        return True, f"No changes in installed packages. `{package_file}` remains unchanged."

    except Exception as e:
        return False, f"Error retrieving installed packages: {str(e)}"

def run_system_checks(test_mode: bool = False) -> bool:
    """Run all system checks if in test mode.
    
    Args:
        test_mode (bool): Whether to run the checks
        
    Returns:
        bool: True if all checks pass or if not in test mode
    """
    if not test_mode:
        return True
        
    # Run Python version check
    version_ok, version_msg = check_python_version()
    print(f"{'✅' if version_ok else '❌'} {version_msg}\n")
    
    # Run requirements check
    reqs_ok, reqs_msg = check_requirements()
    print(f"{'✅' if reqs_ok else '❌'} {reqs_msg}\n")
    
    return version_ok and reqs_ok 