from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from google import genai
from google.genai import types
from dotenv import load_dotenv
from datetime import datetime
import os

load_dotenv()
app = Flask(__name__)

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

search_config = types.GenerateContentConfig(
    tools=[types.Tool(google_search=types.GoogleSearch())],
    system_instruction=(
        "You are Noeta, a helpful, witty, and concise AI assistant. "
        "You explain things clearly, use simple language when possible, "
        "and occasionally add a touch of light humor. Keep answers focused and avoid rambling."
    )
)

chat = client.chats.create(model="gemini-2.5-flash", config=search_config)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat_route():
    user_message = request.json.get("message", "")

    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    current_time = datetime.now().strftime("%A, %B %d, %Y, %I:%M %p")
    message_with_context = f"[Current real date/time: {current_time}]\n\n{user_message}"

    def generate():
        try:
            for chunk in chat.send_message_stream(message_with_context):
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            yield f"\n\n[Error: {str(e)}]"

    return Response(stream_with_context(generate()), mimetype="text/plain")

@app.route("/reset", methods=["POST"])
def reset():
    global chat
    chat = client.chats.create(model="gemini-2.5-flash", config=search_config)
    return jsonify({"status": "cleared"})

if __name__ == "__main__":
    app.run(debug=True)