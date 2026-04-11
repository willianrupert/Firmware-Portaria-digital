from fastapi import FastAPI
import sqlite3
import os

app = FastAPI(title="RLight API Local")

DB_PATH = os.path.join(os.path.dirname(__file__), 'deliveries.db')

@app.get("/entregas")
def list_deliveries(limit: int = 10):
    try:
        conn = sqlite3.connect(DB_PATH)
        rows = conn.execute(
            "SELECT ts, carrier, weight_g, synced FROM deliveries ORDER BY ts DESC LIMIT ?", 
            (limit,)
        ).fetchall()
        return [{"ts": r[0], "carrier": r[1], "peso_g": r[2], "sync": bool(r[3])} for r in rows]
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    # Acessível via http://IP_DA_ORANGE_PI:8080/entregas
    uvicorn.run(app, host="0.0.0.0", port=8080)
