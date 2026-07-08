#!/bin/bash
set -e
echo "🚀 Starting Physics AI Teacher Backend..."
cd "$(dirname "$0")/backend"

# Create venv if needed
if [ ! -d "venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt -q

echo "✅ Backend starting on http://localhost:8000"
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
