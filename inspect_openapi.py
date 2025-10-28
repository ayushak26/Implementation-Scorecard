import requests
import json

url = "http://localhost:8000/openapi.json"

response = requests.get(url)
data = response.json()

# Extract and print all registered paths
paths = data.get("paths", {})
for path, methods in paths.items():
    print(f"Path: {path}")
    for method, details in methods.items():
        print(f"  Method: {method.upper()} - Summary: {details.get('summary', 'No summary')}\n")