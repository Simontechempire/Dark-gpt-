const promptInput = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");
const messagesBox = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const historyBox = document.getElementById("history");

let chats = JSON.parse(localStorage.getItem("darkgpt_chats") || "[]");
let currentChat = null;
let loading = false;

function saveChats() {
  localStorage.setItem("darkgpt_chats", JSON.stringify(chats));
}

function createChat() {
  currentChat = {
    id: Date.now(),
    title: "New conversation",
    messages: []
  };

  chats.unshift(currentChat);
  chats = chats.slice(0, 30);

  saveChats();
  renderHistory();
  renderMessages();
  promptInput.focus();
}

function renderHistory() {
  historyBox.innerHTML = "";

  chats.forEach(chat => {
    const item = document.createElement("div");

    item.className =
      "history-item" +
      (currentChat?.id === chat.id ? " active" : "");

    item.textContent = "◈ " + chat.title;

    item.onclick = () => {
      if (loading) return;

      currentChat = chat;
      renderMessages();
      renderHistory();

      document.getElementById("sidebar").classList.remove("open");
    };

    historyBox.appendChild(item);
  });
}

function renderMessages() {
  messagesBox.innerHTML = "";

  const hasMessages =
    currentChat && currentChat.messages.length > 0;

  welcome.style.display = hasMessages ? "none" : "block";

  if (!currentChat) return;

  currentChat.messages.forEach(message => {
    addMessage(message.role, message.content);
  });
}

function addMessage(role, content) {
  const message = document.createElement("div");
  message.className = "message " + role;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "U" : "D";

  const contentBox = document.createElement("div");
  contentBox.className = "message-content";

  const name = document.createElement("div");
  name.className = "message-name";
  name.textContent =
    role === "user" ? "YOU" : "DARK GPT";

  const text = document.createElement("div");
  text.className = "message-text";
  text.textContent = content;

  contentBox.append(name, text);

  if (role === "assistant") {
    const copy = document.createElement("button");
    copy.className = "copy-btn";
    copy.textContent = "Copy response";

    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(content);
        copy.textContent = "Copied!";
        setTimeout(() => {
          copy.textContent = "Copy response";
        }, 1500);
      } catch {
        copy.textContent = "Copy unavailable";
      }
    };

    contentBox.appendChild(copy);
  }

  message.append(avatar, contentBox);
  messagesBox.appendChild(message);

  document.getElementById("chatArea").scrollTop =
    document.getElementById("chatArea").scrollHeight;
}

function showTyping() {
  const typing = document.createElement("div");

  typing.id = "typing";
  typing.className = "typing";
  typing.textContent = "DARK GPT is thinking...";

  messagesBox.appendChild(typing);

  document.getElementById("chatArea").scrollTop =
    document.getElementById("chatArea").scrollHeight;
}

function removeTyping() {
  document.getElementById("typing")?.remove();
}

async function sendMessage(customText) {
  if (loading) return;

  const text = (customText || promptInput.value).trim();

  if (!text) return;

  if (!currentChat) createChat();

  loading = true;
  sendBtn.disabled = true;

  welcome.style.display = "none";

  currentChat.messages.push({
    role: "user",
    content: text
  });

  if (currentChat.messages.length === 1) {
    currentChat.title =
      text.length > 35
        ? text.substring(0, 35) + "..."
        : text;
  }

  promptInput.value = "";

  addMessage("user", text);
  showTyping();

  saveChats();
  renderHistory();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        messages: currentChat.messages.slice(-30)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "AI request failed.");
    }

    if (!data.reply) {
      throw new Error("No response received.");
    }

    currentChat.messages.push({
      role: "assistant",
      content: data.reply
    });

    removeTyping();
    addMessage("assistant", data.reply);

  } catch (error) {
    removeTyping();

    const errorText =
      "⚠️ DARK GPT ERROR\n\n" + error.message;

    addMessage("assistant", errorText);

  } finally {
    loading = false;
    sendBtn.disabled = false;

    saveChats();
    renderHistory();
    promptInput.focus();
  }
}

sendBtn.addEventListener("click", () => {
  sendMessage();
});

promptInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

promptInput.addEventListener("input", () => {
  promptInput.style.height = "auto";

  promptInput.style.height =
    Math.min(promptInput.scrollHeight, 150) + "px";
});

document.getElementById("newChat").addEventListener("click", () => {
  if (loading) return;

  createChat();

  document.getElementById("sidebar").classList.remove("open");
});

document.getElementById("menuBtn").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.prompt);
  });
});

// Restore previous conversations

if (chats.length > 0) {
  currentChat = chats[0];
  renderMessages();
} else {
  createChat();
}

renderHistory();

console.log("DARK GPT initialized.");
