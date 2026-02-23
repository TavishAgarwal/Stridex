from fastapi.testclient import TestClient
from app import app
import cv2

client = TestClient(app)

with open("test.mp4", "wb") as f:
    f.write(b"dummy_content")

with open("test.mp4", "rb") as f:
    response = client.post("/analyze-video-enhanced", files={"file": ("test.mp4", f, "video/mp4")})

print("Status:", response.status_code)
print("Response:", response.json())
