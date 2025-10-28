import requests

url = "http://localhost:8000/api/sheets"

response = requests.get(url)
print(response.json())