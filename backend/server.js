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
  coins: 450, // Start with some coins to show progression
  streak: 7, // Show a good streak
  badges: [
    { id: "first-steps", name: "First Steps", icon: "🌟", earned: true, earnedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), redeemed: false },
    { id: "topic-master", name: "Topic Master", icon: "🏆", earned: true, earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), redeemed: false },
    { id: "streak-master", name: "Streak Master", icon: "🔥", earned: true, earnedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), redeemed: false },
    { id: "daily-warrior", name: "Daily Warrior", icon: "⚡", earned: true, earnedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), redeemed: false },
    { id: "knowledge-seeker", name: "Knowledge Seeker", icon: "📚", earned: true, earnedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), redeemed: false }
  ],
  completedTopics: [
    {
      name: "Introduction to Machine Learning",
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      coinsEarned: 60,
      score: 85
    },
    {
      name: "Python Programming Basics",
      completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      coinsEarned: 60,
      score: 92
    },
    {
      name: "Data Structures and Algorithms",
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      coinsEarned: 60,
      score: 78
    },
    {
      name: "Web Development Fundamentals",
      completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      coinsEarned: 60,
      score: 88
    },
    {
      name: "Database Design Principles",
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      coinsEarned: 60,
      score: 90
    },
    {
      name: "React.js Advanced Concepts",
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      coinsEarned: 60,
      score: 82
    },
    {
      name: "System Architecture Patterns",
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      coinsEarned: 60,
      score: 87
    }
  ],
  dailyChallenge: {
    bestScore: 12,
    lastPlayedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  streakHistory: [
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
    const basePrompt = `You are an expert educator who creates comprehensive, academically rigorous learning content. Your goal is to make complex topics accessible while maintaining the depth and detail needed for exam success. Break down topics into digestible paragraphs that build understanding progressively.

${topic ? `Topic: ${topic}` : ''}
${extractedText ? `Source Material: ${extractedText}` : ''}

Create a structured learning experience with the following format:

1. PARAGRAPHS: Break the topic into 4-6 focused paragraphs (3-4 sentences each). Each paragraph should:
   - Cover one key concept or aspect of the topic
   - Use clear, precise language while maintaining academic rigor
   - Include relevant examples, analogies, or real-world applications
   - Build upon previous paragraphs to create a complete understanding
   - Be detailed enough for exam preparation

2. QUIZ QUESTIONS: Create 4-6 multiple choice questions that test comprehensive understanding. Each question should:
   - Test different aspects of the topic covered in the paragraphs
   - Have 4 answer options (A, B, C, D)
   - Include one correct answer and three plausible distractors
   - Require genuine understanding, not just memorization

3. KEY TAKEAWAYS: Provide 3-5 main points that summarize the essential knowledge

Format your response as a JSON object with this exact structure:
{
  "paragraphs": [
    {
      "content": "First paragraph content...",
      "title": "Brief title for this paragraph"
    },
    {
      "content": "Second paragraph content...",
      "title": "Brief title for this paragraph"
    }
  ],
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Detailed explanation of why this answer is correct"
    }
  ],
  "keyTakeaways": ["Key point 1", "Key point 2", "Key point 3"],
  "encouragement": "Motivational message for starting this topic"
}

Remember: Maintain academic depth while making content accessible. Students should be able to pass exams after completing this material.`;

    const result = await model.generateContent(basePrompt);
    const responseText = result.response.text();
    
    // Clean up the response to extract JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini');
    }
    
    const learningContent = JSON.parse(jsonMatch[0]);
    
    // Validate the structure
    if (!learningContent.paragraphs || !Array.isArray(learningContent.paragraphs) || 
        !learningContent.questions || !Array.isArray(learningContent.questions)) {
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
  res.json({
    ...userStats,
    completedTopics: userStats.completedTopics || []
  });
});

// Get Leaderboard
app.get('/api/leaderboard', (req, res) => {
  // For demo purposes, create some sample leaderboard data
  const sampleLeaderboard = [
    { name: "Alex", coins: 1250, topicsCompleted: 8, streak: 12 },
    { name: "Sarah", coins: 980, topicsCompleted: 6, streak: 8 },
    { name: "Mike", coins: 750, topicsCompleted: 5, streak: 5 },
    { name: "Emma", coins: 620, topicsCompleted: 4, streak: 3 },
    { name: "You", coins: userStats.coins, topicsCompleted: userStats.completedTopics?.length || 0, streak: userStats.streak }
  ].sort((a, b) => b.coins - a.coins);
  
  res.json({ leaderboard: sampleLeaderboard });
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
      content: {
        ...learningContent,
        topicName: topic || 'Uploaded File'
      },
      progress: {
        currentParagraph: 0,
        currentQuestion: 0,
        correctAnswers: 0,
        totalParagraphs: learningContent.paragraphs.length,
        totalQuestions: learningContent.questions.length,
        paragraphsCompleted: false,
        completed: false
      },
      createdAt: new Date().toISOString()
    };
    
    console.log(`Created learning session: ${sessionId}`);
    
    res.json({
      sessionId,
      currentParagraph: learningContent.paragraphs[0],
      paragraphNumber: 1,
      totalParagraphs: learningContent.paragraphs.length,
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

// Get Next Paragraph
app.get('/api/learning/:sessionId/paragraph', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = learningProgress[sessionId];
    
    if (!session) {
      return res.status(404).json({ error: 'Learning session not found' });
    }
    
    if (session.progress.paragraphsCompleted) {
      return res.status(400).json({ error: 'All paragraphs have been completed' });
    }
    
    const currentParagraphIndex = session.progress.currentParagraph;
    const paragraph = session.content.paragraphs[currentParagraphIndex];
    
    if (!paragraph) {
      return res.status(404).json({ error: 'No more paragraphs available' });
    }
    
    res.json({
      paragraphNumber: currentParagraphIndex + 1,
      totalParagraphs: session.progress.totalParagraphs,
      paragraph: paragraph,
      progress: Math.round(((currentParagraphIndex) / session.progress.totalParagraphs) * 100)
    });
    
  } catch (error) {
    console.error('Error getting paragraph:', error);
    res.status(500).json({ error: 'Failed to get paragraph' });
  }
});

// Submit User Question for Current Paragraph
app.post('/api/learning/:sessionId/question', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userQuestion } = req.body;
    
    const session = learningProgress[sessionId];
    if (!session) {
      return res.status(404).json({ error: 'Learning session not found' });
    }
    
    const currentParagraphIndex = session.progress.currentParagraph;
    const paragraph = session.content.paragraphs[currentParagraphIndex];
    
    if (!paragraph) {
      return res.status(400).json({ error: 'No active paragraph' });
    }
    
    // Generate answer using Gemini
    const questionPrompt = `A student is learning about this topic and just read this paragraph:

PARAGRAPH: "${paragraph.content}"

The student asks: "${userQuestion}"

Please provide a helpful, detailed answer that:
1. Directly addresses their question
2. Builds on the paragraph content they just read
3. Maintains academic rigor while being clear
4. Helps them understand the connection to the broader topic
5. Prepares them for exam-level understanding

Keep your response concise but comprehensive (2-3 sentences).`;

    const result = await model.generateContent(questionPrompt);
    const answer = result.response.text();
    
    res.json({
      answer: answer,
      paragraphNumber: currentParagraphIndex + 1
    });
    
  } catch (error) {
    console.error('Error answering user question:', error);
    res.status(500).json({ error: 'Failed to answer question' });
  }
});

// Move to Next Paragraph
app.post('/api/learning/:sessionId/next-paragraph', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = learningProgress[sessionId];
    
    if (!session) {
      return res.status(404).json({ error: 'Learning session not found' });
    }
    
    session.progress.currentParagraph++;
    
    // Check if all paragraphs completed
    const paragraphsCompleted = session.progress.currentParagraph >= session.progress.totalParagraphs;
    session.progress.paragraphsCompleted = paragraphsCompleted;
    
    if (paragraphsCompleted) {
      res.json({
        paragraphsCompleted: true,
        message: 'All paragraphs completed! Ready for quiz.',
        progress: 100
      });
    } else {
      const nextParagraph = session.content.paragraphs[session.progress.currentParagraph];
      res.json({
        paragraphsCompleted: false,
        nextParagraph: nextParagraph,
        paragraphNumber: session.progress.currentParagraph + 1,
        totalParagraphs: session.progress.totalParagraphs,
        progress: Math.round(((session.progress.currentParagraph) / session.progress.totalParagraphs) * 100)
      });
    }
    
  } catch (error) {
    console.error('Error moving to next paragraph:', error);
    res.status(500).json({ error: 'Failed to move to next paragraph' });
  }
});

// Get Next Question (Quiz after paragraphs)
app.get('/api/learning/:sessionId/question', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = learningProgress[sessionId];
    
    if (!session) {
      return res.status(404).json({ error: 'Learning session not found' });
    }
    
    if (!session.progress.paragraphsCompleted) {
      return res.status(400).json({ error: 'Must complete all paragraphs before starting quiz' });
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
      
      // Add to streak history
      const today = new Date().toISOString().split('T')[0];
      if (!userStats.streakHistory.includes(today)) {
        userStats.streakHistory.push(today);
      }
      
      // Track completed topic
      const session = learningProgress[sessionId];
      if (session && session.content) {
        const topicName = session.content.topicName || 'Unknown Topic';
        userStats.completedTopics.push({
          name: topicName,
          completedAt: new Date().toISOString(),
          coinsEarned: 50,
          score: Math.round((session.progress.correctAnswers / session.progress.totalQuestions) * 100)
        });
      }
      
      // Award badges
      if (!userStats.badges.find(b => b.name === 'Topic Master')) {
        userStats.badges.push({ 
          id: 'topic-master',
          name: 'Topic Master', 
          icon: '🏆', 
          earned: true, 
          earnedAt: new Date().toISOString(),
          redeemed: false
        });
      }
      
      if (userStats.streak >= 3 && !userStats.badges.find(b => b.name === 'Streak Master')) {
        userStats.badges.push({ 
          id: 'streak-master',
          name: 'Streak Master', 
          icon: '🔥', 
          earned: true, 
          earnedAt: new Date().toISOString(),
          redeemed: false
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
    coins: 450,
    streak: 7,
    badges: [
      { id: "first-steps", name: "First Steps", icon: "🌟", earned: true, earnedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), redeemed: false },
      { id: "topic-master", name: "Topic Master", icon: "🏆", earned: true, earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), redeemed: false },
      { id: "streak-master", name: "Streak Master", icon: "🔥", earned: true, earnedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), redeemed: false },
      { id: "daily-warrior", name: "Daily Warrior", icon: "⚡", earned: true, earnedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), redeemed: false },
      { id: "knowledge-seeker", name: "Knowledge Seeker", icon: "📚", earned: true, earnedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), redeemed: false }
    ],
    completedTopics: [
      {
        name: "Introduction to Machine Learning",
        completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        coinsEarned: 60,
        score: 85
      },
      {
        name: "Python Programming Basics",
        completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        coinsEarned: 60,
        score: 92
      },
      {
        name: "Data Structures and Algorithms",
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        coinsEarned: 60,
        score: 78
      },
      {
        name: "Web Development Fundamentals",
        completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        coinsEarned: 60,
        score: 88
      },
      {
        name: "Database Design Principles",
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        coinsEarned: 60,
        score: 90
      },
      {
        name: "React.js Advanced Concepts",
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        coinsEarned: 60,
        score: 82
      },
      {
        name: "System Architecture Patterns",
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        coinsEarned: 60,
        score: 87
      }
    ],
    dailyChallenge: {
      bestScore: 12,
      lastPlayedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    streakHistory: [
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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

// ---------------------------
// Daily Challenge Endpoints
// ---------------------------

// In-memory daily challenges
let dailyChallenges = {};
let preparedDaily = {};

const generateDailyQuestions = async () => {
  // Try Gemini-generated questions; fall back to static if fails
  try {
    const prompt = `Create 40 rapid-fire general knowledge multiple-choice questions suitable for a 60-second blitz. Return ONLY JSON with this exact structure:
{
  "questions": [
    { "q": "Question text?", "options": ["Option A","Option B","Option C","Option D"], "correct": 0 }
  ]
}
Questions must be short, unambiguous, and cover diverse topics (science, history, geography, vocabulary, math quick facts).`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) throw new Error('Bad structure');
    return parsed.questions;
  } catch (e) {
    return [
      { q: 'Capital of France?', options: ['Paris','Berlin','Madrid','Rome'], correct: 0 },
      { q: '2 + 2 = ?', options: ['3','4','5','6'], correct: 1 },
      { q: 'Water chemical formula?', options: ['CO2','H2O','NaCl','O2'], correct: 1 },
      { q: 'Largest planet?', options: ['Mars','Earth','Jupiter','Venus'], correct: 2 },
      { q: 'Author of "1984"?', options: ['Orwell','Huxley','Tolkien','Rowling'], correct: 0 },
      { q: 'Fastest land animal?', options: ['Cheetah','Lion','Horse','Tiger'], correct: 0 },
      { q: 'Prime number?', options: ['9','15','21','17'], correct: 3 },
      { q: 'Boiling point of water (°C)?', options: ['90','95','100','120'], correct: 2 },
      { q: 'Ocean between Africa and Australia?', options: ['Atlantic','Indian','Arctic','Pacific'], correct: 1 },
      { q: 'Symbol for Sodium?', options: ['So','Na','Sn','Sd'], correct: 1 }
    ];
  }
};

const getTimeRemainingMs = (challenge) => {
  const endAt = challenge.startedAt + challenge.durationMs;
  return Math.max(0, endAt - Date.now());
};

app.post('/api/daily-challenge/start', async (req, res) => {
  try {
    const preparedId = req.body?.preparedId;
    const challengeId = Date.now().toString();
    const questions = preparedId && preparedDaily[preparedId]
      ? preparedDaily[preparedId].questions
      : await generateDailyQuestions();
    dailyChallenges[challengeId] = {
      id: challengeId,
      startedAt: Date.now(),
      durationMs: 60 * 1000,
      index: 0,
      score: 0,
      questions
    };
    userStats.dailyChallenge.lastPlayedAt = new Date().toISOString();
    
    // Add to streak history for daily challenge
    const today = new Date().toISOString().split('T')[0];
    if (!userStats.streakHistory.includes(today)) {
      userStats.streakHistory.push(today);
    }
    
    res.json({
      challengeId,
      timeRemainingMs: 60 * 1000,
      firstQuestion: questions[0]
        ? { q: questions[0].q, options: questions[0].options, questionNumber: 1 }
        : null
    });
  } catch (error) {
    console.error('Error starting daily challenge:', error);
    res.status(500).json({ error: 'Failed to start daily challenge' });
  }
});

// Prepare daily challenge ahead of time (generate and cache questions)
app.post('/api/daily-challenge/prepare', async (req, res) => {
  try {
    const preparedId = Date.now().toString();
    const questions = await generateDailyQuestions();
    preparedDaily[preparedId] = {
      id: preparedId,
      questions,
      createdAt: Date.now()
    };
    // Return minimal preview to allow instant UI render
    const preview = questions[0]
      ? { q: questions[0].q, options: questions[0].options }
      : null;
    res.json({ preparedId, preview });
  } catch (error) {
    console.error('Error preparing daily challenge:', error);
    res.status(500).json({ error: 'Failed to prepare daily challenge' });
  }
});

app.get('/api/daily-challenge/:id/question', (req, res) => {
  try {
    const { id } = req.params;
    const challenge = dailyChallenges[id];
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const remaining = getTimeRemainingMs(challenge);
    if (remaining <= 0) {
      return res.json({ completed: true, score: challenge.score, timeRemainingMs: 0 });
    }

    const q = challenge.questions[challenge.index];
    if (!q) return res.json({ completed: true, score: challenge.score, timeRemainingMs: remaining });

    res.json({
      completed: false,
      questionNumber: challenge.index + 1,
      question: q.q,
      options: q.options,
      timeRemainingMs: remaining,
      score: challenge.score
    });
  } catch (error) {
    console.error('Error getting daily question:', error);
    res.status(500).json({ error: 'Failed to get question' });
  }
});

app.post('/api/daily-challenge/:id/answer', (req, res) => {
  try {
    const { id } = req.params;
    const { selectedAnswer } = req.body;
    const challenge = dailyChallenges[id];
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const remaining = getTimeRemainingMs(challenge);
    if (remaining <= 0) {
      return res.json({ completed: true, score: challenge.score, timeRemainingMs: 0, userStats });
    }

    const q = challenge.questions[challenge.index];
    if (!q) {
      return res.json({ completed: true, score: challenge.score, timeRemainingMs: remaining, userStats });
    }

    const isCorrect = parseInt(selectedAnswer) === q.correct;
    if (isCorrect) {
      challenge.score += 1;
      userStats.coins += 10;
    }
    challenge.index += 1;

    const nextRemaining = getTimeRemainingMs(challenge);
    const completed = nextRemaining <= 0 || challenge.index >= challenge.questions.length;

    if (completed) {
      if (challenge.score > userStats.dailyChallenge.bestScore) {
        userStats.dailyChallenge.bestScore = challenge.score;
      }
    }

    res.json({
      correct: isCorrect,
      score: challenge.score,
      completed,
      timeRemainingMs: nextRemaining,
      userStats: {
        coins: userStats.coins,
        streak: userStats.streak,
        badges: userStats.badges,
        dailyChallenge: userStats.dailyChallenge
      }
    });
  } catch (error) {
    console.error('Error submitting daily answer:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// Redeem badge for coins
app.post('/api/badges/redeem', (req, res) => {
  try {
    const { badgeId } = req.body;
    
    const badge = userStats.badges.find(b => b.id === badgeId);
    if (!badge || !badge.earned) {
      return res.status(400).json({ error: 'Badge not found or not earned' });
    }
    
    if (badge.redeemed) {
      return res.status(400).json({ error: 'Badge already redeemed' });
    }
    
    // Award coins based on badge type
    let coinsAwarded = 50; // default
    if (badge.name.includes('Master')) coinsAwarded = 100;
    if (badge.name.includes('Streak')) coinsAwarded = 75;
    if (badge.name.includes('First')) coinsAwarded = 25;
    
    userStats.coins += coinsAwarded;
    badge.redeemed = true;
    badge.redeemedAt = new Date().toISOString();
    
    res.json({
      success: true,
      coinsAwarded,
      userStats: {
        coins: userStats.coins,
        streak: userStats.streak,
        badges: userStats.badges
      }
    });
    
  } catch (error) {
    console.error('Error redeeming badge:', error);
    res.status(500).json({ error: 'Failed to redeem badge' });
  }
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