import sys
import os
import traceback
import asyncio

# Add the parent directory to the Python path so we can import the app package
sys.path.insert(0, os.path.abspath('..'))

# # Print the Python path for debugging
# print("Python path:")
# for path in sys.path:
#     print(f"  - {path}")

print("\nAttempting to import main from app.api...")
# Try to import and run the main function
try:
    # Import the main function directly
    from app.api import main
    print("Successfully imported main, now executing...")
    if __name__ == "__main__":
        # Run the main function
        asyncio.run(main())
except ImportError as e:
    print(f"Import error: {e}")
    print("Traceback:")
    traceback.print_exc()
    print("\nYou may need to update the imports in the files to reflect the new structure.")
except Exception as e:
    print(f"General error: {e}")
    print("Traceback:")
    traceback.print_exc() 