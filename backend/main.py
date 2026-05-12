from server import app

# This module exists so `uvicorn main:app` works (matching project scripts)
# Keep minimal: uvicorn will import `app` from here.
