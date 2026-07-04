const chatBox = document.getElementById("chat-box");
const input = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const themeBtn = document.getElementById("theme-btn");
const welcomeScreen = document.getElementById("welcome-screen");
const splash = document.getElementById("splash");

// Hide splash screen shortly after load
window.addEventListener("load", () => {
    setTimeout(() => splash.classList.add("hide"), 600);
});

// Theme handling (persisted across visits)
function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeBtn.textContent = theme === "light" ? "☀️" : "🌙";
    localStorage.setItem("noeta-theme", theme);
}

const savedTheme = localStorage.getItem("noeta-theme") || "dark";
applyTheme(savedTheme);

themeBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "light" ? "dark" : "light");
});

// Auto-resize textarea
input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 140) + "px";
});

// Enter to send, Shift+Enter for newline
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

function hideWelcomeScreen() {
    if (welcomeScreen) welcomeScreen.remove();
}

function addMessageRow(sender) {
    const row = document.createElement("div");
    row.className = `message-row ${sender}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = sender === "user" ? "🧑" : "🤖";

    const bubble = document.createElement("div");
    bubble.className = `message ${sender}`;

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatBox.appendChild(row);
    chatBox.scrollTop = chatBox.scrollHeight;
    return bubble;
}

function addMessage(text, sender) {
    const bubble = addMessageRow(sender);
    bubble.textContent = text;
    return bubble;
}

function showTypingIndicator() {
    const row = document.createElement("div");
    row.className = "message-row bot";
    row.id = "typing-indicator";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = "🤖";

    const dots = document.createElement("div");
    dots.className = "message bot typing-indicator";
    dots.innerHTML = "<span></span><span></span><span></span>";

    row.appendChild(avatar);
    row.appendChild(dots);
    chatBox.appendChild(row);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) indicator.remove();
}

async function streamReply(message) {
    const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
    });

    removeTypingIndicator();

    const bubble = addMessageRow("bot");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        bubble.innerHTML = marked.parse(fullText);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

async function sendMessage(prefilled) {
    const message = (prefilled ?? input.value).trim();
    if (!message) return;

    hideWelcomeScreen();
    addMessage(message, "user");
    input.value = "";
    input.style.height = "auto";
    showTypingIndicator();

    try {
        await streamReply(message);
    } catch (err) {
        removeTypingIndicator();
        addMessage("Something went wrong. Please try again.", "bot");
    }
}

async function startNewChat() {
    await fetch("/reset", { method: "POST" });
    chatBox.innerHTML = `
        <div id="welcome-screen">
            <h2>Hi, I'm Noeta</h2>
            <p>Ask me anything — I can even search the web for live info.</p>
            <div class="chips">
                <button class="chip">Explain quantum computing simply</button>
                <button class="chip">Write a short poem about the ocean</button>
                <button class="chip">What's trending today?</button>
                <button class="chip">Give me 3 productivity tips</button>
            </div>
        </div>
    `;
    attachChipListeners();
}

function attachChipListeners() {
    document.querySelectorAll(".chip").forEach((chip) => {
        chip.addEventListener("click", () => sendMessage(chip.textContent));
    });
}

sendBtn.addEventListener("click", () => sendMessage());
newChatBtn.addEventListener("click", startNewChat);
attachChipListeners();