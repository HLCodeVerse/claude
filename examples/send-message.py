"""
Evolution API v2 - Python WhatsApp Message Sender Example

Requirements:
    pip install requests

Usage:
    python send-message.py
"""

import os
import requests
import json

SERVER_URL = os.getenv("SERVER_URL", "http://localhost:8080").rstrip("/")
API_KEY = os.getenv("AUTHENTICATION_API_KEY", "evol_whatsapp_api_secret_key_2026")
INSTANCE_NAME = os.getenv("INSTANCE_NAME", "my_whatsapp_bot")
RECIPIENT_NUMBER = os.getenv("RECIPIENT_NUMBER", "15551234567") # Format: CountryCode + Number

HEADERS = {
    "apikey": API_KEY,
    "Content-Type": "application/json"
}

def check_connection():
    url = f"{SERVER_URL}/instance/connectionState/{INSTANCE_NAME}"
    response = requests.get(url, headers=HEADERS)
    if response.status_code == 200:
        data = response.json()
        return data.get("instance", {}).get("state") or data.get("state")
    return "unknown"

def send_text_message(number: str, message: str):
    url = f"{SERVER_URL}/message/sendText/{INSTANCE_NAME}"
    payload = {
        "number": number,
        "text": message
    }
    response = requests.post(url, headers=HEADERS, json=payload)
    return response.status_code, response.json()

def send_image_message(number: str, image_url: str, caption: str = ""):
    url = f"{SERVER_URL}/message/sendMedia/{INSTANCE_NAME}"
    payload = {
        "number": number,
        "mediatype": "image",
        "media": image_url,
        "caption": caption
    }
    response = requests.post(url, headers=HEADERS, json=payload)
    return response.status_code, response.json()

if __name__ == "__main__":
    print(f"Connecting to Evolution API: {SERVER_URL}")
    state = check_connection()
    print(f"Instance '{INSTANCE_NAME}' state: {state}")

    if state != "open":
        print("[!] Instance is not currently connected to WhatsApp.")
        print("[!] Scan QR code via the Web Dashboard or terminal connect endpoint.")
    else:
        print(f"Sending WhatsApp message to: {RECIPIENT_NUMBER}...")
        status, result = send_text_message(
            RECIPIENT_NUMBER,
            "Hello from Python Evolution API! 🐍✨\nAutomated message."
        )
        print(f"Status: {status}")
        print("Response:", json.dumps(result, indent=2))
