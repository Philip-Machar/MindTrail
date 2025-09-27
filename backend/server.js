// server.js - MindTrail Simple Backend (No Authentication)
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdf = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'], // React and Vite ports
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, text, and image files are allowed'));
    }
  }
});

// Simple in-memory storage for learning sessions
let learningProgress = {};
let userStats = {
  coins: 0,
  streak: 1,
  badges: [
    { name: "First Steps", icon: "🌟", earned: true, earnedAt: new Date().toISOString() }
  ]
};

// Helper Functions
const generateEncouragingMessage = (isCorrect, streak = 0) => {
  const correctMessages = [
    "🎉 Excellent work! You're crushing it!",
    "⭐ Amazing! Your brain is getting stronger!",
    "🚀 Fantastic! You're on fire today!",
    "💪 Outstanding! Keep that momentum going!",
    "🌟 Perfect! You're becoming a learning champion!",
    "🎯 Brilliant! Your focus is paying off!",
    "🔥 Incredible! You're making great progress!"
  ];

  const incorrectMessages = [
    "💙 That's okay! Every mistake helps you learn!",
    "🌱 No worries! Your brain is still growing!",
    "💫 Keep trying! You're closer than you think!",
    "🎈 Good attempt! Learning is a journey!",
    "⚡ Nice try! You've got this next time!",
    "🌈 Don't give up! Every expert was once a beginner!",
    "🎯 Keep going! You're building resilience!"
  ];

  if (isCorrect) {
    let message = correctMessages[Math.floor(Math.random() * correctMessages.length)];
    if (streak > 1) {
      message += ` 🔥 ${streak} day streak!`;
    }
    return message;
  } else {
    return incorrectMessages[Math.floor(Math.random() * incorrectMessages.length)];
  }
};

const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error('Failed to extract text from PDF');
  }
};

const extractTextFromImage = async (filePath) => {
  try {
    const imageBuffer = await fs.readFile(filePath);
    const base64Image = imageBuffer.toString('base64');
    
    const prompt = `Extract all text content from this image. If it contains educational material, notes, or any readable text, please transcribe it accurately. If it's handwritten, do your best to interpret it clearly.`;
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: path.extname(filePath) === '.png' ? 'image/png' : 'image/jpeg'
        }
      }
    ]);
    
    return result.response.text();
  } catch (error) {
    throw new Error('Failed to extract text from image');
  }
};

const generateLearningContent = async (topic, extractedText = '') => {
  try {
    const basePrompt = `You are an expert educator specializing in creating engaging, bite-sized learning content for students with ADHD and dyslexia. Your task is to break down complex topics into digestible, interactive lessons, don't dumb down the content, keep it engaging and interesting.

${topic ? `Topic: ${topic}` : ''}
${extractedText ? `Source Material: ${extractedText}` : ''}

Please create a comprehensive learning experience with the following structure:

1. EXPLANATION: Write 2-3 short, engaging paragraphs (2-3 sentences each) that explain the topic in a fun, relatable way but don't dumb it down too much. Use analogies, real-world examples, and simple language. Make it conversational and exciting.

2. QUIZ QUESTIONS: Create 3-4 multiple choice questions that test understanding. Each question should have:
   - A clear, simple question
   - 4 answer options (A, B, C, D)
   - Only ONE correct answer
   - Options that are clearly different from each other

3. KEY TAKEAWAYS: Provide 2-3 main points students should remember

Format your response as a JSON object with this exact structure:
{
  "explanation": "Your engaging explanation here...",
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Why this answer is correct"
    }
  ],
  "keyTakeaways": ["Key point 1", "Key point 2", "Key point 3"],
  "encouragement": "Motivational message for starting this topic"
}

Remember: Keep language simple, use exciting analogies but don't dumb it down too much, and make learning feel like an adventure!`;

    const result = await model.generateContent(basePrompt);
    const responseText = result.response.text();
    
    // Clean up the response to extract JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini');
    }
    
    const learningContent = JSON.parse(jsonMatch[0]);
    
    // Validate the structure
    if (!learningContent.explanation || !learningContent.questions || !Array.isArray(learningContent.questions)) {
      throw new Error('Invalid learning content structure');
    }
    
    return learningContent;
  } catch (error) {
    console.error('Error generating learning content:', error);
    throw new Error('Failed to generate learning content: ' + error.message);
  }
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'MindTrail Backend is running!', 
    timestamp: new Date().toISOString(),
    geminiConnected: !!process.env.GEMINI_API_KEY
  });
});

// Get User Stats (simplified)
app.get('/api/user/stats', (req, res) => {
  res.json(userStats);
});

// Process Learning Content (Topic or File)
app.post('/api/learning/process', upload.single('file'), async (req, res) => {
  try {
    const { topic } = req.body;
    const file = req.file;
    
    if (!topic && !file) {
      return res.status(400).json({ error: 'Either topic or file is required' });
    }
    
    let extractedText = '';
    
    // Process uploaded file if provided
    if (file) {
      try {
        console.log(`Processing file: ${file.filename}, type: ${file.mimetype}`);
        
        if (file.mimetype === 'application/pdf') {
          extractedText = await extractTextFromPDF(file.path);
        } else if (file.mimetype === 'text/plain') {
          extractedText = await fs.readFile(file.path, 'utf8');
        } else if (file.mimetype.startsWith('image/')) {
          extractedText = await extractTextFromImage(file.path);
        }
        
        console.log(`Extracted text length: ${extractedText.length}`);
        
        // Clean up uploaded file
        await fs.unlink(file.path);
      } catch (fileError) {
        console.error('File processing error:', fileError);
        if (file.path) await fs.unlink(file.path).catch(() => {});
        return res.status(400).json({ error: 'Failed to process uploaded file: ' + fileError.message });
      }
    }
    
    // Generate learning content using Gemini
    console.log('Generating learning content with Gemini...');
    const learningContent = await generateLearningContent(topic, extractedText);
    
    // Store learning session
    const sessionId = Date.now().toString();
    learningProgress[sessionId] = {
      content: learningContent,
      progress: {
        currentQuestion: 0,
        correctAnswers: 0,
        totalQuestions: learningContent.questions.length,
        completed: false
      },
      createdAt: new Date().toISOString()
    };
    
    console.log(`Created learning session: ${sessionId}`);
    
    res.json({
      sessionId,
      explanation: learningContent.explanation,
      totalQuestions: learningContent.questions.length,
      encouragement: learningContent.encouragement,
      keyTakeaways: learningContent.keyTakeaways
    });
    
  } catch (error) {
    console.error('Error processing learning content:', error);
    res.status(500).json({ 
      error: 'Failed to process learning content', 
      details: error.message 
    });
  }
});

// Get Next Question
app.get('/api/learning/:sessionId/question', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = learningProgress[sessionId];
    
    if (!session) {
      return res.status(404).json({ error: 'Learning session not found' });
    }
    
    if (session.progress.completed) {
      return res.status(400).json({ error: 'Learning session already completed' });
    }
    
    const currentQuestionIndex = session.progress.currentQuestion;
    const question = session.content.questions[currentQuestionIndex];
    
    if (!question) {
      return res.status(404).json({ error: 'No more questions available' });
    }
    
    res.json({
      questionNumber: currentQuestionIndex + 1,
      totalQuestions: session.progress.totalQuestions,
      question: question.question,
      options: question.options,
      progress: Math.round(((currentQuestionIndex) / session.progress.totalQuestions) * 100)
    });
    
  } catch (error) {
    console.error('Error getting question:', error);
    res.status(500).json({ error: 'Failed to get question' });
  }
});

// Submit Answer
app.post('/api/learning/:sessionId/answer', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { selectedAnswer } = req.body;
    
    const session = learningProgress[sessionId];
    if (!session) {
      return res.status(404).json({ error: 'Learning session not found' });
    }
    
    const currentQuestionIndex = session.progress.currentQuestion;
    const question = session.content.questions[currentQuestionIndex];
    
    if (!question) {
      return res.status(400).json({ error: 'No active question' });
    }
    
    const isCorrect = parseInt(selectedAnswer) === question.correct;
    
    // Update progress
    if (isCorrect) {
      session.progress.correctAnswers++;
      userStats.coins += 10; // Award coins
    }
    
    session.progress.currentQuestion++;
    
    // Check if completed
    const isCompleted = session.progress.currentQuestion >= session.progress.totalQuestions;
    session.progress.completed = isCompleted;
    
    // Completion bonus
    if (isCompleted) {
      userStats.coins += 50; // Completion bonus
      userStats.streak += 1;
      
      // Award badges
      if (!userStats.badges.find(b => b.name === 'Topic Master')) {
        userStats.badges.push({ 
          name: 'Topic Master', 
          icon: '🏆', 
          earned: true, 
          earnedAt: new Date().toISOString() 
        });
      }
      
      if (userStats.streak >= 3 && !userStats.badges.find(b => b.name === 'Streak Master')) {
        userStats.badges.push({ 
          name: 'Streak Master', 
          icon: '🔥', 
          earned: true, 
          earnedAt: new Date().toISOString() 
        });
      }
    }
    
    const encouragement = generateEncouragingMessage(isCorrect, userStats.streak);
    
    res.json({
      correct: isCorrect,
      explanation: question.explanation,
      encouragement,
      coinsEarned: isCorrect ? (isCompleted ? 60 : 10) : 0,
      completed: isCompleted,
      progress: Math.round((session.progress.currentQuestion / session.progress.totalQuestions) * 100),
      userStats: {
        coins: userStats.coins,
        streak: userStats.streak,
        badges: userStats.badges
      },
      finalScore: isCompleted ? {
        correctAnswers: session.progress.correctAnswers,
        totalQuestions: session.progress.totalQuestions,
        percentage: Math.round((session.progress.correctAnswers / session.progress.totalQuestions) * 100),
        keyTakeaways: session.content.keyTakeaways
      } : null
    });
    
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// Reset progress (for testing)
app.post('/api/reset', (req, res) => {
  learningProgress = {};
  userStats = {
    coins: 0,
    streak: 1,
    badges: [
      { name: "First Steps", icon: "🌟", earned: true, earnedAt: new Date().toISOString() }
    ]
  };
  res.json({ message: 'Progress reset successfully' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  console.error('Server error:', error);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Create uploads directory
const createUploadsDir = async () => {
  try {
    await fs.access('./uploads');
  } catch {
    await fs.mkdir('./uploads');
  }
};

// Start server
const startServer = async () => {
  await createUploadsDir();
  
  // Check if Gemini API key is set
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  WARNING: GEMINI_API_KEY not set. Please add it to your .env file');
    console.warn('   Get your API key from: https://makersuite.google.com/app/apikey');
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 MindTrail Simple Backend running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔑 Gemini API: ${process.env.GEMINI_API_KEY ? '✅ Connected' : '❌ Not configured'}`);
    console.log(`📁 Upload directory: ./uploads/`);
    console.log(`🌐 CORS enabled for: http://localhost:3000`);
  });
};

startServer().catch(console.error);

// Export for testing
module.exports = app;