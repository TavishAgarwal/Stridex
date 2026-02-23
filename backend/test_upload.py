import urllib.request
import urllib.parse
import json

url = 'http://localhost:8000/analyze-video-enhanced'
data = b'--boundary\r\nContent-Disposition: form-data; name="file"; filename="test.mp4"\r\nContent-Type: video/mp4\r\n\r\ndummy content\r\n--boundary--\r\n'
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'multipart/form-data; boundary=boundary'})
try:
    with urllib.request.urlopen(req) as resp:
        print("Status:", resp.status)
        print("Response:", resp.read().decode())
except urllib.error.HTTPError as e:
    print("Status:", e.code)
    print("Response:", e.read().decode())
