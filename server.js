const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: message }]
                }]
            })
        });
        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
        res.json({ reply });
    } catch (error) {
        console.error('Error connecting to Gemini API:', error);
        res.status(500).send("Error connecting to AI");
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));