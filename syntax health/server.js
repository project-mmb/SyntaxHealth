const express = require('express');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // or gpt-3.5-turbo
            messages: [{ role: "user", content: message }],
        });
        res.json({ reply: completion.choices[0].message.content });
    } catch (error) {
        res.status(500).send("Error connecting to AI");
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));