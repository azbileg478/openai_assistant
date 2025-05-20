const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { OpenAI } = require('openai');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = "your_secret_key";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const assistant_id = process.env.ASSISTANT_ID;

// LOGIN endpoint
app.post('/login', (req,res)=>{
    const {username,password} = req.body;

    if(username === "user" && password === "password123"){
        const token = jwt.sign({username}, SECRET_KEY,{expiresIn:'24h'});
        res.json({success:true, token});
    }else{
        res.json({success:false});
    }
});

// middleware auth
function authMiddleware(req,res,next){
    const token = req.headers.authorization;
    if(!token) return res.status(403).json({error:"Not Authorized"});

    jwt.verify(token, SECRET_KEY,(err,user)=>{
        if(err)return res.status(403).json({error:"Invalid Token"});
        req.user = user;
        next();
    });
}

app.post('/chat', authMiddleware, async (req, res) => {
    try {
        const { message, threadId } = req.body;

        let thread;

        if (threadId) {
            try {
                thread = await openai.beta.threads.retrieve(threadId);
            } catch {
                thread = await openai.beta.threads.create();
            }
        } else {
            thread = await openai.beta.threads.create();
        }

        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: message
        });

        let run = await openai.beta.threads.runs.create(thread.id, { assistant_id });
        let runStatus;
        do {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        } while (runStatus.status !== "completed");

        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        const replyText = assistantMessage.content.find(c => c.type === 'text').text.value;

        const files = assistantMessage.content.flatMap(contentItem => 
            contentItem.type === 'text' ? contentItem.text.annotations.filter(a => a.type === 'file_path') : []
        );

        const downloadableFiles = await Promise.all(files.map(async(file)=>{
            const fileInfo = await openai.files.retrieve(file.file_path.file_id);
            const fileDownload = await openai.files.content(file.file_path.file_id);
            const buffers = [];
            for await (const chunk of fileDownload.body) buffers.push(chunk);
            const fileBuffer = Buffer.concat(buffers);
            return {
                file_name: file.text,
                file_data: fileBuffer.toString('base64'),
                mime_type: fileInfo.content_type || 'application/octet-stream'
            };
        }));

        // Accurate token counting
        const tokenUsage = runStatus.usage ? runStatus.usage.total_tokens : 0;

        res.json({ 
            reply: replyText, 
            files: downloadableFiles, 
            tokenUsage,
            threadId: thread.id
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000,()=>console.log("http://localhost:3000"));