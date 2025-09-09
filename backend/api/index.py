# api/index.py
import sys
import os

# Add the parent directory to the Python path so we can import from server.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mangum import Mangum
from server import app  # Import your FastAPI app from server.py

# Wrap your FastAPI app for Vercel
handler = Mangum(app)