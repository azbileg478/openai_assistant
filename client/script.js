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

    // Quick fix: Ensure tables are properly formatted
    if(sender === 'bot'){
        // Force line breaks around pipes '|' to help marked parser understand
        text = text.replace(/\|/g, ' | ').replace(/ {2,}/g, ' ').replace(/\n(\s)*\n/g, '\n');
    }

    msg.innerHTML = sender === 'bot' ? marked.parse(text) : text;
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
  
        // First parse markdown only for reply text
        const replyText = marked.parse(data.reply);
  
        // Create element to handle content and links separately
        const contentContainer = document.createElement('div');
        contentContainer.innerHTML = replyText;
  
        // Now handle file links separately (don't mark large file base64 strings)
        if (data.files?.length) {
          const filesContainer = document.createElement('div');
          filesContainer.style.marginTop = "10px";
          data.files.forEach(file => {
            const filenameOnly = file.file_name.split('/').pop();
            const anchor = document.createElement('a');
            anchor.href = `data:${file.mime_type};base64,${file.file_data}`;
            anchor.download = filenameOnly;
            anchor.innerText = `📎 ${filenameOnly}`;
            anchor.className = "btn btn-sm btn-outline-primary me-2 mb-2";
            filesContainer.appendChild(anchor);
          });
          contentContainer.appendChild(filesContainer);
        }
  
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message bot-message';
        msgDiv.appendChild(contentContainer);
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
  
        if (data.threadId) {
          localStorage.setItem('threadId', data.threadId);
          updateThreadIdDisplay(data.threadId); // Update thread ID
        }
  
        if (data.tokenUsage) {
          const currentTokens = parseInt(tokenCountElem.textContent) || 0;
          tokenCountElem.textContent = currentTokens + data.tokenUsage;
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