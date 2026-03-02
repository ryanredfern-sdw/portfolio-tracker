$env:PYTHONPATH = "C:\Users\Master\.gemini\antigravity\playground\sidereal-cluster"
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
