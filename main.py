import os
import sys

# Ensure backend directory is in python sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from backend.app.main import app
