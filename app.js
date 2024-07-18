import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import session from 'express-session';
import dotenv from 'dotenv';
import fs from 'fs';
import { OpenAI } from 'openai';

dotenv.config();

const app = express();
const port = 3000;

// Define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the upload directory exists
const pdfDirectory = path.join(__dirname, 'pdfs');
if (!fs.existsSync(pdfDirectory)) {
    fs.mkdirSync(pdfDirectory);
}

// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, pdfDirectory);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/pdfs', express.static(pdfDirectory));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.get('/', (req, res) => {
    res.render("index.ejs");
});

app.get('/convertPdf', (req, res) => {
    const pdfName = req.query.pdfName; // Get the PDF name from the query parameter
    res.render('convertPdf', { pdfName: pdfName });
});

// Handle file upload
app.post('/uploadPdf', upload.single('pdfFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.json({ fileName: req.file.originalname });
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.post('/generate-response', async (req, res) => {
    const { prompt, matchedSection } = req.body;
    const instruction = `
    You are an AI tutor focused on step-by-step guidance. Your goal is to help users find answers on their own by providing hints and asking guiding questions.
    -by interactive with the user
    - Never provide the full answer directly.
    - Break down the problem into smaller steps.
    - Offer hints on how to approach each step.
    - Highlight important steps, hints, or information using <strong> for bold text or <mark> for highlighted text.
    - Ask questions to prompt the user's thinking and understanding.
    - If a formula or specific information is requested, provide it, but avoid giving away the full solution.
    - Always engage the user by asking follow-up questions to ensure they understand each part of the process.
    `;

    if (!matchedSection) {
        return res.json({ reply: "No relevant content found. Please rephrase your question." });
    }

    // Initialize conversation history for the session if it doesn't exist
    if (!req.session.conversationHistory) {
        req.session.conversationHistory = [];
    }

    try {
        // Combine the instruction, page content, and user's prompt
        const fullPrompt = `Relevant Content:\n${matchedSection}\n\n${instruction}\n\n\nUser's Question:\n${prompt}`;

        console.log(fullPrompt);

        const messages = req.session.conversationHistory.concat({ role: 'user', content: fullPrompt });

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Use the desired OpenAI model
            messages: messages,
            max_tokens: 1000
        });

        const aiResponse = response.choices[0].message.content.trim();

        // Update conversation history with latest message and response
        req.session.conversationHistory.push({ role: 'user', content: prompt });
        req.session.conversationHistory.push({ role: 'assistant', content: aiResponse });

        res.json({ reply: aiResponse });
    } catch (error) {
        console.error('Error generating AI response:', error);

        let errorMessage = 'Error generating AI response';
        if (error.code === 'insufficient_quota') {
            errorMessage = 'You have exceeded your current quota. Please check your plan and billing details.';
        }

        res.status(500).json({ error: errorMessage });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
