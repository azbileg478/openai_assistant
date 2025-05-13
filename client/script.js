if(!localStorage.getItem('token')){
    window.location.replace("login.html");
}

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const tokenCountElem = document.getElementById("token-count");
const backendUrl = 'https://openai-assistant-lovat-six.vercel.app'; // fixed!

function addMessage(text, sender = 'bot') {
    const msg = document.createElement('div');
    msg.className = `message ${sender}-message`;
    msg.innerHTML = text;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    const message = userInput.value;
    if (!message.trim()) return;

    addMessage(message, 'user');
    userInput.value = "";

    const res = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization":localStorage.getItem('token')
        },
        body: JSON.stringify({ message })
    });

    const data = await res.json();

    if (res.ok) {
        addMessage(data.reply);

        if (data.files?.length) {
            data.files.forEach(file => {
                const a = `<a download="${file.file_name}" href="data:${file.mime_type};base64,${file.file_data}">🔗 Download "${file.file_name}"</a>`;
                addMessage(a);
            });
        }

        if(data.tokenUsage){
            tokenCountElem.textContent = data.tokenUsage;
        }
    } else {
        addMessage("❌ Error: " + data.error);
    }
}

sendBtn.onclick = sendMessage;
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});