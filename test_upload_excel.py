import requests

url = "http://localhost:8000/api/upload-excel"
file_path = "C:\\Users\\asuto\\Documents\\Implementation-Scorecard\\test.xlsx"

with open(file_path, "rb") as f:
    response = requests.post(url, files={"file": f})

print(response.json())