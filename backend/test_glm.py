"""Test Z.AI via OpenAI-compatible endpoint."""
import os
from dotenv import load_dotenv
load_dotenv()

from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("ZHIPU_API_KEY"),
    base_url="https://api.z.ai/api/coding/paas/v4",
)

for model in ["glm-4-flash", "glm-4-air", "glm-5.1", "glm-4-plus"]:
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "say hi"}],
            max_tokens=10,
        )
        print(f"✅ {model} — {resp.choices[0].message.content}")
        break
    except Exception as e:
        print(f"❌ {model} — {str(e)[:100]}")
