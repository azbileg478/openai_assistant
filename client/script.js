if (!localStorage.getItem('token')) {
    window.location.replace("login.html");
}

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const refreshBtn = document.getElementById("refresh-btn");
const tokenCountElem = document.getElementById("token-count");
const logoutBtn = document.getElementById("logout-btn");
const backendUrl = 'https://openai-assistant-lovat-six.vercel.app'; // Replace with your backend URL
// const backendUrl = 'http://localhost:3000'; // Replace with your backend URL

window.addEventListener('load', () => {
    localStorage.removeItem('threadId');
});

function addMessage(text, sender = 'bot') {
    const msg = document.createElement('div');
    msg.className = `message ${sender}-message`;

    marked.setOptions({
        gfm: true,
        breaks: true,
    });

    if(sender === 'bot'){
        try {
            // Avoid markdown parsing file download links
            let placeholder = "%%LINK_PLACEHOLDER%%";
            let linksCache = [];

            // Temporarily remove download link HTML tags
            text = text.replace(/<a .*?<\/a>/gi, (match) => {
                linksCache.push(match);
                return placeholder;
            });

            // Parse markdown safely
            text = marked.parse(text);

            // Restore original links back safely into final html
            linksCache.forEach(link => {
                text = text.replace(placeholder, link);
            });

            msg.innerHTML = text;

        } catch (error) {
            // fallback (when markdown fails)
            msg.textContent = text;
            console.error('Markdown Parsing Error:', error);
        }
    } else {
        // simple user message handling
        msg.textContent = text;
    }

    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function updateProcessingMessage(text) {
    let processingMsg = document.getElementById('processing-msg');
    if (!processingMsg) {
        processingMsg = document.createElement('div');
        processingMsg.className = 'message bot-message';
        processingMsg.id = 'processing-msg';
        chatBox.appendChild(processingMsg);
    }
    processingMsg.innerHTML = text;
    chatBox.scrollTop = chatBox.scrollHeight;
}

function removeProcessingMessage() {
    const processingMsg = document.getElementById('processing-msg');
    if (processingMsg) processingMsg.remove();
}

function updateThreadIdDisplay(threadId) {
    const threadIdElem = document.getElementById('thread-id');
    threadIdElem.textContent = threadId || 'なし';
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    userInput.value = "";

    updateProcessingMessage('📤 リクエストを送信中...');

    const threadId = localStorage.getItem('threadId');

    try {
        updateProcessingMessage('🔄 サーバーが処理中...');

        const res = await fetch(`${backendUrl}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": localStorage.getItem('token')
            },
            body: JSON.stringify({ message, threadId })
        });

        updateProcessingMessage('⏳ 応答を待っています...');

        const data = await res.json();

        if (res.ok) {
            updateProcessingMessage('✅ 応答を受信しました！');
            await new Promise(resolve => setTimeout(resolve, 500));

            let replyWithLinks = data.reply;

            if (data.files?.length) {
                data.files.forEach(file => {
                    const filenameOnly = file.file_name.split('/').pop();
                    const downloadLink = `<a download="${filenameOnly}" href="data:${file.mime_type};base64,${file.file_data}">📎 ${filenameOnly}</a>`;
                    replyWithLinks = replyWithLinks.replace(file.file_name, downloadLink);
                });
            }

            addMessage(replyWithLinks);

            if (data.threadId) {
                localStorage.setItem('threadId', data.threadId);
                updateThreadIdDisplay(data.threadId); // Update displayed thread ID
            }

            if (data.tokenUsage) {
                tokenCountElem.textContent = parseInt(tokenCountElem.textContent) + data.tokenUsage;
            }
        } else {
            addMessage("❌ エラー: " + data.error);
        }
    } catch (error) {
        addMessage("❌ エラー: " + error.message);
    } finally {
        removeProcessingMessage();
    }
}

function refreshConversation() {
    localStorage.removeItem('threadId');
    updateThreadIdDisplay(null); // Reset displayed thread ID
    chatBox.innerHTML = '<div class="message bot-message">🔄 会話がリセットされました。新しい質問をどうぞ！</div>';
    tokenCountElem.textContent = '0';
}

sendBtn.onclick = sendMessage;
refreshBtn.onclick = refreshConversation;
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

logoutBtn.onclick = function(){
    localStorage.clear(); // Clear all stored data (tokens, thread id)
    window.location.href = 'login.html'; // Redirect to login page
};