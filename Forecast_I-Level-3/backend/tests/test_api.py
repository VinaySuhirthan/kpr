from fastapi.testclient import TestClient
from level3_app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_tool_status_endpoint():
    response = client.get("/api/v1/amr/tool-status")
    assert response.status_code == 200
    data = response.json()
    assert "available" in data
    assert isinstance(data["available"], bool)

def test_analyze_invalid_extension():
    # Sending a .txt file instead of .csv or .fasta
    files = {"file": ("test.txt", b"random content", "text/plain")}
    response = client.post("/api/v1/amr/analyze", files=files)
    assert response.status_code == 400
    data = response.json()
    assert "Unsupported file format" in data["detail"]

def test_analyze_empty_csv():
    files = {"file": ("empty.csv", b"", "text/csv")}
    response = client.post("/api/v1/amr/analyze", files=files)
    assert response.status_code == 400
    data = response.json()
    assert "empty" in data["detail"].lower()

def test_analyze_missing_columns_csv():
    bad_csv = b"colA,colB\n1,2"
    files = {"file": ("bad.csv", bad_csv, "text/csv")}
    response = client.post("/api/v1/amr/analyze", files=files)
    assert response.status_code == 400
    data = response.json()
    assert "missing required column" in data["detail"].lower()
