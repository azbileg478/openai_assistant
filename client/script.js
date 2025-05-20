if (!localStorage.getItem('token')) {
    window.location.replace("login.html");
}

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const refreshBtn = document.getElementById("refresh-btn");
const tokenCountElem = document.getElementById("token-count");
const backendUrl = 'https://your-vercel-app-url.vercel.app'; // Replace with your backend URL


window.addEventListener('load', () => {
    localStorage.removeItem('threadId');
});

function addMessage(text, sender = 'bot') {
    const msg = document.createElement('div');
    msg.className = `message ${sender}-message`;
    msg.innerHTML = text;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function showProcessing(show = true) {
    if (show) {
        const processingMsg = document.createElement('div');
        processingMsg.className = 'message bot-message';
        processingMsg.id = 'processing-msg';
        processingMsg.innerHTML = '⏳ 処理中...';
        chatBox.appendChild(processingMsg);
        chatBox.scrollTop = chatBox.scrollHeight;
    } else {
        const processingMsg = document.getElementById('processing-msg');
        if (processingMsg) processingMsg.remove();
    }
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    userInput.value = "";
    showProcessing(true);

    const threadId = localStorage.getItem('threadId');

    try {
        const res = await fetch(`${backendUrl}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": localStorage.getItem('token')
            },
            body: JSON.stringify({ message, threadId })
        });

        const data = await res.json();

        if (res.ok) {
            addMessage(data.reply);

            if (data.threadId) {
                localStorage.setItem('threadId', data.threadId);
            }

            if (data.files?.length) {
                data.files.forEach(file => {
                    const a = `<a download="${file.file_name}" href="data:${file.mime_type};base64,${file.file_data}">🔗 Download "${file.file_name}"</a>`;
                    addMessage(a);
                });
            }

            if (data.tokenUsage) {
                tokenCountElem.textContent = parseInt(tokenCountElem.textContent) + data.tokenUsage;
            }
        } else {
            addMessage("❌ Error: " + data.error);
        }
    } catch (error) {
        addMessage("❌ Error: " + error.message);
    } finally {
        showProcessing(false);
    }
}

function refreshConversation() {
    localStorage.removeItem('threadId');
    chatBox.innerHTML = '<div class="message bot-message">こんにちは！何かお手伝いできることがあれば、どうぞ遠慮なくご相談ください。</div>';
    tokenCountElem.textContent = '0';
}

sendBtn.onclick = sendMessage;
refreshBtn.onclick = refreshConversation;
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});