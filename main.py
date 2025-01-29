import sys
import os
import subprocess

def check_python_and_packages():
    """Check if Python is running and generate a requirements.txt file."""

    # Check Python version
    python_version = sys.version
    print(f"✅ Python is running! Version: {python_version}\n")

    # File to save package list
    package_file = "requirements.txt"

    try:
        # Generate requirements.txt (overwrites each time)
        result = subprocess.run(["pip", "freeze"], capture_output=True, text=True, check=True)

        with open(package_file, "w", encoding="utf-8") as file:
            file.write(result.stdout)

        print(f"✅ Package list saved to {package_file} (for Docker)")

    except Exception as e:
        print(f"❌ Error retrieving installed packages: {e}")

def main():
    check_python_and_packages()

if __name__ == "__main__":
    main()

