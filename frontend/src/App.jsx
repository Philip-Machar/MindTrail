import React, { useState, useEffect } from 'react';
import { Upload, BookOpen, Trophy, Coins, Flame, CheckCircle, XCircle, Star, Target, Brain, Timer, Volume2, VolumeX } from 'lucide-react';

const App = () => {
  // API Configuration
  const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://eduquest-woad.vercel.app/api'
    : 'http://localhost:3001/api';
  
  // State management
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTopic, setCurrentTopic] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [currentParagraph, setCurrentParagraph] = useState(null);
  const [paragraphNumber, setParagraphNumber] = useState(0);
  const [totalParagraphs, setTotalParagraphs] = useState(0);
  const [paragraphsCompleted, setParagraphsCompleted] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [questionAnswer, setQuestionAnswer] = useState('');
  const [showQuestionAnswer, setShowQuestionAnswer] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(1);
  const [progress, setProgress] = useState(0);
  const [badges, setBadges] = useState([]);
  const [isLearning, setIsLearning] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [keyTakeaways, setKeyTakeaways] = useState([]);
  const [showDashboard, setShowDashboard] = useState(true);
  const [completedTopics, setCompletedTopics] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showDailyChallenge, setShowDailyChallenge] = useState(false);
  const [dailyChallengeId, setDailyChallengeId] = useState(null);
  const [dailyTimeMs, setDailyTimeMs] = useState(0);
  const [dailyQuestion, setDailyQuestion] = useState(null);
  const [dailySelected, setDailySelected] = useState('');
  const [dailyScore, setDailyScore] = useState(0);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [dailyPreparedId, setDailyPreparedId] = useState(null);
  const [dailyPreview, setDailyPreview] = useState(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [streakHistory, setStreakHistory] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);

  useEffect(() => {
    fetchUserStats();
    prepareDailyChallenge();
    fetchLeaderboard();
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/stats`);
      if (response.ok) {
        const stats = await response.json();
        setCoins(stats.coins);
        setStreak(stats.streak);
        setBadges(stats.badges || []);
        setCompletedTopics(stats.completedTopics || []);
        setStreakHistory(stats.streakHistory || []);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/leaderboard`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  // Daily Challenge API helpers
  const prepareDailyChallenge = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/daily-challenge/prepare`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setDailyPreparedId(data.preparedId);
        setDailyPreview(data.preview || null);
      }
    } catch (e) {
      // silent fail; fallback path will still work
      console.warn('Daily prepare failed:', e);
    }
  };

  const startDailyChallenge = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/daily-challenge/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preparedId: dailyPreparedId || undefined })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start');
      setDailyChallengeId(data.challengeId);
      setDailyTimeMs(data.timeRemainingMs);
      setDailyScore(0);
      setDailyCompleted(false);
      setDailySelected('');
      setShowDailyChallenge(true);
      if (data.firstQuestion) {
        setDailyQuestion({
          question: data.firstQuestion.q,
          options: data.firstQuestion.options,
          questionNumber: data.firstQuestion.questionNumber
        });
      } else {
        await fetchDailyQuestion(data.challengeId);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const fetchDailyQuestion = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/daily-challenge/${id}/question`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch question');
      setDailyTimeMs(data.timeRemainingMs || 0);
      setDailyScore(data.score || 0);
      if (data.completed) {
        setDailyCompleted(true);
        setDailyQuestion(null);
      } else {
        setDailyQuestion({
          question: data.question,
          options: data.options,
          questionNumber: data.questionNumber
        });
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const submitDailyAnswer = async () => {
    if (!dailyChallengeId || dailySelected === '') return;
    try {
      const response = await fetch(`${API_BASE_URL}/daily-challenge/${dailyChallengeId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedAnswer: dailySelected })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit');
      setCoins(data.userStats?.coins ?? coins);
      setDailyScore(data.score || 0);
      setDailyCompleted(!!data.completed);
      setDailySelected('');
      setDailyTimeMs(data.timeRemainingMs || 0);
      fetchLeaderboard(); // Update leaderboard after daily challenge
      if (!data.completed) {
        await fetchDailyQuestion(dailyChallengeId);
      } else {
        setDailyQuestion(null);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  // Redeem badge for coins
  const redeemBadge = async (badgeId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/badges/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to redeem');
      setCoins(data.userStats?.coins ?? coins);
      setBadges(data.userStats?.badges ?? badges);
      setShowRedeemModal(false);
      fetchLeaderboard(); // Update leaderboard after redemption
    } catch (e) {
      setError(e.message);
    }
  };

  // Text-to-Speech functions
  const playTextToSpeech = async (text) => {
    try {
      // Stop current audio if playing
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      const response = await fetch(`${API_BASE_URL}/tts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      setCurrentAudio(audio);
      setIsPlaying(true);

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setError('Failed to play audio');
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      setIsPlaying(false);
      setError('Text-to-speech failed: ' + error.message);
    }
  };

  const stopTextToSpeech = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
    }
  };

  // Countdown timer for daily challenge
  useEffect(() => {
    if (!showDailyChallenge || dailyCompleted) return;
    if (dailyTimeMs <= 0) {
      setDailyCompleted(true);
      return;
    }
    const interval = setInterval(() => {
      setDailyTimeMs((ms) => Math.max(0, ms - 100));
    }, 100);
    return () => clearInterval(interval);
  }, [showDailyChallenge, dailyCompleted, dailyTimeMs]);

  const showDashboardView = () => {
    setShowDashboard(true);
    setIsLearning(false);
    fetchLeaderboard();
  };

  const showLearningView = () => {
    setShowDashboard(false);
    setIsLearning(false);
  };

  const handleStartLearning = async () => {
    if (!currentTopic && !uploadedFile) {
      setError('Please enter a topic or upload a file!');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      if (currentTopic) {
        formData.append('topic', currentTopic);
      }
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      }

      const response = await fetch(`${API_BASE_URL}/learning/process`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setSessionId(data.sessionId);
        setCurrentParagraph(data.currentParagraph);
        setParagraphNumber(data.paragraphNumber);
        setTotalParagraphs(data.totalParagraphs);
        setParagraphsCompleted(false);
        setKeyTakeaways(data.keyTakeaways || []);
        setIsLearning(true);
        setProgress(0);
        setUserQuestion('');
        setQuestionAnswer('');
        setShowQuestionAnswer(false);
      } else {
        setError(data.error || 'Failed to process learning content');
      }
    } catch (error) {
      setError('Network error. Please check that the backend server is running on port 3001.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitUserQuestion = async () => {
    if (!userQuestion.trim() || !sessionId) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/learning/${sessionId}/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userQuestion: userQuestion
        })
      });

      const data = await response.json();

      if (response.ok) {
        setQuestionAnswer(data.answer);
        setShowQuestionAnswer(true);
        setUserQuestion('');
      } else {
        setError(data.error || 'Failed to get answer');
      }
    } catch (error) {
      setError('Network error. Please check that the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const moveToNextParagraph = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/learning/${sessionId}/next-paragraph`, {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        if (data.paragraphsCompleted) {
          setParagraphsCompleted(true);
          setProgress(100);
          // Start quiz after paragraphs are completed
          await getNextQuestion(sessionId);
        } else {
          setCurrentParagraph(data.nextParagraph);
          setParagraphNumber(data.paragraphNumber);
          setProgress(data.progress);
          setUserQuestion('');
          setQuestionAnswer('');
          setShowQuestionAnswer(false);
        }
      } else {
        setError(data.error || 'Failed to move to next paragraph');
      }
    } catch (error) {
      setError('Network error. Please check that the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const getNextQuestion = async (sessionIdToUse) => {
    try {
      const response = await fetch(`${API_BASE_URL}/learning/${sessionIdToUse}/question`);
      const data = await response.json();

      if (response.ok) {
        setCurrentQuestion({
          question: data.question,
          options: data.options,
          questionNumber: data.questionNumber,
          totalQuestions: data.totalQuestions
        });
        setProgress(data.progress);
        setSelectedAnswer('');
        setShowFeedback(false);
      } else {
        setError(data.error || 'Failed to get question');
      }
    } catch (error) {
      setError('Network error. Please check that the backend server is running.');
    }
  };

  const handleAnswerSubmit = async () => {
    if (!sessionId || selectedAnswer === '') return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/learning/${sessionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selectedAnswer: selectedAnswer
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsCorrect(data.correct);
        setShowFeedback(true);
        
        if (data.userStats) {
          setCoins(data.userStats.coins);
          setStreak(data.userStats.streak);
          setBadges(data.userStats.badges || []);
          fetchLeaderboard(); // Update leaderboard after quiz completion
        }
        
        setProgress(data.progress);
        
        setCurrentFeedback({
          encouragement: data.encouragement,
          explanation: data.explanation,
          completed: data.completed,
          finalScore: data.finalScore,
          coinsEarned: data.coinsEarned
        });
      } else {
        setError(data.error || 'Failed to submit answer');
      }
    } catch (error) {
      setError('Network error. Please check that the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    if (currentFeedback?.completed) {
      setTimeout(() => {
        handleTopicComplete();
      }, 2000);
      return;
    }

    if (sessionId) {
      await getNextQuestion(sessionId);
    }
  };

  const handleTopicComplete = () => {
    setIsLearning(false);
    setCurrentTopic('');
    setUploadedFile(null);
    setCurrentParagraph(null);
    setParagraphNumber(0);
    setTotalParagraphs(0);
    setParagraphsCompleted(false);
    setUserQuestion('');
    setQuestionAnswer('');
    setShowQuestionAnswer(false);
    setCurrentQuestion(null);
    setProgress(0);
    setSessionId(null);
    setCurrentFeedback(null);
    setShowFeedback(false);
    setSelectedAnswer('');
    setKeyTakeaways([]);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'text/plain', 'image/jpeg', 'image/jpg', 'image/png'];
      const maxSize = 10 * 1024 * 1024;

      if (!allowedTypes.includes(file.type)) {
        setError('Please upload only PDF, text files, or images (JPG, PNG)');
        return;
      }

      if (file.size > maxSize) {
        setError('File size must be less than 10MB');
        return;
      }

      setUploadedFile(file);
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-purple-500/20 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6 text-purple-900" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-yellow-300">EduQuest</h1>
              <div className="text-xs text-purple-200">Learning Quest</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="bg-red-500/80 px-3 py-1 rounded-full flex items-center space-x-2">
              <Flame className="w-4 h-4 text-white" />
              <span className="text-white font-bold">{streak}</span>
            </div>
            <div className="bg-yellow-500/80 px-3 py-1 rounded-full flex items-center space-x-2">
              <Coins className="w-4 h-4 text-white" />
              <span className="text-white font-bold">{coins}</span>
            </div>
            <button
              onClick={showDashboardView}
              className="bg-purple-500/80 px-4 py-2 rounded-full text-white font-bold hover:bg-purple-400/80 transition-all flex items-center space-x-2"
            >
              <Trophy className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={startDailyChallenge}
              className="bg-pink-500/80 px-4 py-2 rounded-full text-white font-bold hover:bg-pink-400/80 transition-all flex items-center space-x-2"
            >
              <Timer className="w-4 h-4" />
              <span>Daily</span>
            </button>
            <button
              onClick={showLearningView}
              className="bg-green-500/80 px-4 py-2 rounded-full text-white font-bold hover:bg-green-400/80 transition-all flex items-center space-x-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>Learn</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {showDailyChallenge ? (
          /* Daily Challenge View */
          <div className="space-y-6">
            <div className="bg-black/30 backdrop-blur-sm border border-pink-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
                    <Timer className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-pink-300">Daily Challenge</h3>
                </div>
                <div className="bg-yellow-500/80 px-3 py-1 rounded-full text-white font-bold text-sm flex items-center space-x-2">
                  <Coins className="w-4 h-4" />
                  <span>+10 per correct</span>
                </div>
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur-sm border border-pink-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-pink-200 font-bold">Score: {dailyScore}</div>
                <div className="flex items-center space-x-2 bg-pink-500/20 border border-pink-400/40 px-3 py-1 rounded-full">
                  <Timer className="w-4 h-4 text-pink-300" />
                  <span className="text-pink-200 font-bold">{(dailyTimeMs/1000).toFixed(1)}s</span>
                </div>
              </div>

              {dailyCompleted ? (
                <div className="text-center space-y-4">
                  <h4 className="text-2xl font-black text-pink-300">Time's up!</h4>
                  <p className="text-pink-100">You answered {dailyScore} correctly.</p>
                  <button
                    onClick={() => { setShowDailyChallenge(false); setDailyChallengeId(null); }}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-xl font-bold hover:from-purple-400 hover:to-pink-400 transition-all"
                  >
                    Back to Home
                  </button>
                </div>
              ) : dailyQuestion ? (
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-pink-200 mb-1">Q{dailyQuestion.questionNumber}</div>
                    <h4 className="text-lg font-semibold text-white">{dailyQuestion.question}</h4>
                  </div>
                  <div className="space-y-3">
                    {dailyQuestion.options.map((opt, idx) => (
                      <label key={idx} className="flex items-center space-x-3 p-4 bg-white/5 border border-pink-400/30 rounded-xl hover:bg-white/10 cursor-pointer transition-all">
                        <input
                          type="radio"
                          name="daily-answer"
                          value={idx}
                          checked={dailySelected === idx.toString()}
                          onChange={(e) => setDailySelected(e.target.value)}
                          className="text-pink-500"
                        />
                        <span className="text-white">{opt}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={submitDailyAnswer}
                    disabled={dailySelected === ''}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-bold hover:from-pink-400 hover:to-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit & Next
                  </button>
                </div>
              ) : (
                <div className="text-center text-pink-200">Loading question...</div>
              )}
            </div>
          </div>
        ) : showDashboard ? (
          /* Dashboard View */
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-black/30 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-yellow-300 mb-2">Your Learning Journey</h2>
                  <p className="text-purple-200">Track your progress, achievements, and consistency</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-300">{coins}</div>
                  <div className="text-sm text-purple-200">Total Coins</div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Streak Card */}
              <div className="bg-black/30 backdrop-blur-sm border border-red-500/30 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                    <Flame className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-red-300">Learning Streak</h3>
                    <p className="text-red-200">Days of consistent learning</p>
                  </div>
                </div>
                <div className="text-3xl font-black text-red-300 mb-2">{streak}</div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-red-400 to-orange-400 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(streak * 10, 100)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-red-200 mt-2">Keep the momentum going!</p>
                
                {/* Streak Calendar */}
                <div className="mt-4">
                  <h4 className="text-sm font-bold text-red-300 mb-2">Recent Activity</h4>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 14 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (13 - i));
                      const dateStr = date.toISOString().split('T')[0];
                      const isActive = streakHistory.includes(dateStr);
                      const isToday = dateStr === new Date().toISOString().split('T')[0];
                      
                      return (
                        <div
                          key={i}
                          className={`w-6 h-6 rounded text-xs flex items-center justify-center ${
                            isActive 
                              ? 'bg-green-500 text-white' 
                              : isToday 
                                ? 'bg-gray-500 text-white' 
                                : 'bg-gray-700 text-gray-400'
                          }`}
                          title={date.toLocaleDateString()}
                        >
                          {date.getDate()}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center space-x-4 mt-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-green-300">Active</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-gray-500 rounded"></div>
                      <span className="text-gray-300">Today</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-gray-700 rounded"></div>
                      <span className="text-gray-400">Inactive</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Topics Completed */}
              <div className="bg-black/30 backdrop-blur-sm border border-green-500/30 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-300">Topics Mastered</h3>
                    <p className="text-green-200">Knowledge areas completed</p>
                  </div>
                </div>
                <div className="text-3xl font-black text-green-300 mb-2">{completedTopics.length}</div>
                <div className="space-y-2">
                  {completedTopics.slice(0, 3).map((topic, index) => (
                    <div key={index} className="text-sm text-green-200 bg-green-500/20 px-3 py-1 rounded-full">
                      {topic.name}
                    </div>
                  ))}
                  {completedTopics.length > 3 && (
                    <div className="text-sm text-green-300">+{completedTopics.length - 3} more</div>
                  )}
                </div>
              </div>

              {/* Trophies */}
              <div className="bg-black/30 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-yellow-300">Achievements</h3>
                      <p className="text-yellow-200">Badges and trophies earned</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRedeemModal(true)}
                    className="bg-yellow-500/80 px-3 py-1 rounded-full text-white text-sm font-bold hover:bg-yellow-400/80 transition-all"
                  >
                    Redeem
                  </button>
                </div>
                <div className="text-3xl font-black text-yellow-300 mb-2">{badges.filter(b => b.earned).length}</div>
                <div className="flex flex-wrap gap-2">
                  {badges.filter(b => b.earned).slice(0, 4).map((badge, index) => (
                    <div key={index} className="text-2xl">{badge.icon}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-black/30 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-blue-300">Leaderboard</h3>
              </div>
              
              <div className="space-y-3">
                {leaderboard.length > 0 ? (
                  leaderboard.map((user, index) => (
                    <div key={index} className={`flex items-center justify-between p-4 rounded-xl ${
                      index === 0 ? 'bg-yellow-500/20 border border-yellow-400/50' :
                      index === 1 ? 'bg-gray-400/20 border border-gray-400/50' :
                      index === 2 ? 'bg-orange-500/20 border border-orange-400/50' :
                      'bg-white/5 border border-gray-600/50'
                    }`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-orange-500 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-bold text-white">{user.name || `Player ${index + 1}`}</div>
                          <div className="text-sm text-gray-300">{user.topicsCompleted || 0} topics completed</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-yellow-300">{user.coins || 0}</div>
                        <div className="text-sm text-gray-300">coins</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No leaderboard data available yet</p>
                    <p className="text-sm">Complete some topics to see your ranking!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-black/30 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-purple-300">Recent Activity</h3>
              </div>
              
              <div className="space-y-4">
                {completedTopics.slice(0, 5).map((topic, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-white">{topic.name}</div>
                        <div className="text-sm text-gray-300">Completed {topic.completedAt}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-300">+{topic.coinsEarned || 50}</div>
                      <div className="text-sm text-gray-300">coins</div>
                    </div>
                  </div>
                ))}
                
                {completedTopics.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No completed topics yet</p>
                    <p className="text-sm">Start learning to see your activity here!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : !isLearning ? (
          /* Start Screen */
          <div className="bg-black/30 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-10 h-10 text-purple-900" />
              </div>
              <h2 className="text-3xl font-black text-yellow-300 mb-2">Choose Your Quest!</h2>
              <p className="text-purple-200">Ready to embark on a learning adventure?</p>
            </div>

            <div className="space-y-6">
              {error && (
                <div className="bg-red-500/20 border border-red-400/50 text-red-200 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              
              {/* Topic Input */}
              <div>
                <label className="block text-purple-200 font-bold mb-2">Enter Learning Topic</label>
                <input
                  type="text"
                  value={currentTopic}
                  onChange={(e) => setCurrentTopic(e.target.value)}
                  placeholder="e.g., Space Exploration, Ancient History..."
                  className="w-full p-4 bg-white/10 border border-purple-400/30 rounded-xl text-white placeholder-purple-300 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  disabled={isLoading}
                />
              </div>

              {/* OR Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-purple-400/30"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-purple-600 text-white font-bold rounded-full text-sm">OR</span>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-purple-200 font-bold mb-2">Upload Knowledge File</label>
                <div className="border-2 border-dashed border-purple-400/50 rounded-xl p-6 text-center hover:border-purple-300 transition-colors bg-white/5">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.txt,.jpg,.jpeg,.png"
                    className="hidden"
                    id="file-upload"
                    disabled={isLoading}
                  />
                  <label htmlFor="file-upload" className={`cursor-pointer ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
                    <Upload className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                    <p className="text-white font-medium">
                      {uploadedFile ? uploadedFile.name : "Click to upload file"}
                    </p>
                    <p className="text-sm text-purple-300 mt-2">PDF, TXT, JPG, PNG (Max 10MB)</p>
                  </label>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartLearning}
                disabled={(!currentTopic && !uploadedFile) || isLoading}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-purple-900 py-4 rounded-xl text-lg font-black hover:from-yellow-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-purple-900 border-t-transparent rounded-full"></div>
                    <span>Loading Quest...</span>
                  </>
                ) : (
                  <>
                    <Star className="w-5 h-5" />
                    <span>Start Quest!</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Learning Interface */
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="bg-black/30 backdrop-blur-sm border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-300 font-bold">Quest Progress</span>
                <span className="text-green-300 font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div 
                  className="bg-gradient-to-r from-green-400 to-blue-400 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Paragraph Learning */}
            {!paragraphsCompleted && currentParagraph && (
              <div className="bg-black/30 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-blue-300">Learning Journey</h3>
                  </div>
                  <div className="bg-blue-500/80 px-3 py-1 rounded-full text-white font-bold text-sm">
                    {paragraphNumber}/{totalParagraphs}
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-blue-200">{currentParagraph.title}</h4>
                    <button
                      onClick={() => isPlaying ? stopTextToSpeech() : playTextToSpeech(currentParagraph.content)}
                      className="bg-blue-500/80 hover:bg-blue-400/80 p-2 rounded-full transition-all"
                      title={isPlaying ? "Stop reading" : "Read aloud"}
                    >
                      {isPlaying ? (
                        <VolumeX className="w-4 h-4 text-white" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                  <p className="text-lg text-blue-100 leading-relaxed">{currentParagraph.content}</p>
                </div>

                {/* User Question Section */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-blue-200 font-bold mb-2">
                      Do you have any questions about this paragraph?
                    </label>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={userQuestion}
                        onChange={(e) => setUserQuestion(e.target.value)}
                        placeholder="Ask anything you'd like to understand better..."
                        className="flex-1 p-3 bg-white/10 border border-blue-400/30 rounded-xl text-white placeholder-blue-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        disabled={isLoading}
                      />
                      <button
                        onClick={submitUserQuestion}
                        disabled={!userQuestion.trim() || isLoading}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-400 hover:to-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Asking...' : 'Ask'}
                      </button>
                    </div>
                  </div>

                  {/* Question Answer */}
                  {showQuestionAnswer && questionAnswer && (
                    <div className="bg-green-500/20 border border-green-400/50 rounded-xl p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">💡</span>
                        </div>
                        <h4 className="font-bold text-green-300">Answer:</h4>
                      </div>
                      <p className="text-green-100">{questionAnswer}</p>
                    </div>
                  )}

                  {/* Next Paragraph Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={moveToNextParagraph}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-3 rounded-xl font-bold hover:from-green-400 hover:to-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Loading...' : paragraphNumber === totalParagraphs ? 'Start Quiz!' : 'Next Paragraph'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quiz Section - Only show after paragraphs are completed */}
            {paragraphsCompleted && (
              <div className="bg-black/30 backdrop-blur-sm border border-green-500/30 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-green-300">Quiz Time!</h3>
                </div>
                <p className="text-green-100 mb-6">Now let's test your understanding with some questions.</p>
              </div>
            )}

            {/* Quiz */}
            {paragraphsCompleted && currentQuestion && (
              <div className="bg-black/30 backdrop-blur-sm border border-orange-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-orange-300">Battle Challenge</h3>
                  </div>
                  {currentQuestion.questionNumber && (
                    <div className="bg-orange-500/80 px-3 py-1 rounded-full text-white font-bold text-sm">
                      {currentQuestion.questionNumber}/{currentQuestion.totalQuestions}
                    </div>
                  )}
                </div>

                {!showFeedback ? (
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-orange-100">{currentQuestion.question}</h4>
                    
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => (
                        <label key={index} className="flex items-center space-x-3 p-4 bg-white/5 border border-orange-400/30 rounded-xl hover:bg-white/10 cursor-pointer transition-all">
                          <input
                            type="radio"
                            name="answer"
                            value={index}
                            checked={selectedAnswer === index.toString()}
                            onChange={(e) => setSelectedAnswer(e.target.value)}
                            className="text-orange-500"
                          />
                          <span className="text-white">{option}</span>
                        </label>
                      ))}
                    </div>

                    <button
                      onClick={handleAnswerSubmit}
                      disabled={selectedAnswer === '' || isLoading}
                      className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 rounded-xl font-bold hover:from-green-400 hover:to-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Checking...' : 'Submit Answer'}
                    </button>
                  </div>
                ) : (
                  /* Feedback */
                  <div className="text-center space-y-6">
                    <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
                      isCorrect ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {isCorrect ? (
                        <CheckCircle className="w-10 h-10 text-white" />
                      ) : (
                        <XCircle className="w-10 h-10 text-white" />
                      )}
                    </div>
                    
                    <div>
                      <h3 className={`text-2xl font-bold mb-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {isCorrect ? 'Victory!' : 'Try Again!'}
                      </h3>
                      <p className="text-white mb-2">{currentFeedback?.encouragement}</p>
                      {currentFeedback?.explanation && (
                        <p className="text-gray-300 text-sm">💡 {currentFeedback.explanation}</p>
                      )}
                    </div>

                    {currentFeedback?.coinsEarned > 0 && (
                      <div className="bg-yellow-500/20 border border-yellow-400 rounded-lg p-3">
                        <div className="flex items-center justify-center space-x-2 text-yellow-300">
                          <Coins className="w-5 h-5" />
                          <span className="font-bold">+{currentFeedback.coinsEarned} coins!</span>
                        </div>
                      </div>
                    )}

                    {currentFeedback?.completed && currentFeedback?.finalScore && (
                      <div className="bg-purple-500/20 border border-purple-400 rounded-lg p-4">
                        <h4 className="font-bold text-lg text-purple-200 mb-2">🏆 Quest Complete!</h4>
                        <p className="text-white">
                          Score: {currentFeedback.finalScore.correctAnswers}/{currentFeedback.finalScore.totalQuestions} 
                          ({currentFeedback.finalScore.percentage}%)
                        </p>
                        {currentFeedback.finalScore.keyTakeaways && (
                          <div className="mt-3 text-left">
                            <p className="font-medium text-purple-200 mb-2">Key Learnings:</p>
                            <ul className="text-sm text-purple-100 space-y-1">
                              {currentFeedback.finalScore.keyTakeaways.map((takeaway, index) => (
                                <li key={index}>• {takeaway}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={handleNextQuestion}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-xl font-bold hover:from-purple-400 hover:to-pink-400 transition-all"
                    >
                      {currentFeedback?.completed ? 'Complete! 🎉' : 'Next Challenge'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Badges */}
            {badges.length > 0 && (
              <div className="bg-black/30 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-yellow-300">Trophy Collection</h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {badges.map((badge, index) => (
                    <div key={badge.id || index} className={`text-center p-4 rounded-xl border transition-all ${
                      badge.earned ? 'border-yellow-400/50 bg-yellow-500/10' : 'border-gray-600/50 bg-gray-800/20'
                    }`}>
                      <div className={`text-3xl mb-2 ${badge.earned ? '' : 'grayscale opacity-50'}`}>
                        {badge.icon}
                      </div>
                      <div className={`text-sm font-medium ${badge.earned ? 'text-yellow-200' : 'text-gray-400'}`}>
                        {badge.name}
                      </div>
                      {badge.earned && badge.earnedAt && (
                        <div className="text-xs text-yellow-400 mt-1">
                          {new Date(badge.earnedAt).toLocaleDateString()}
                        </div>
                      )}
                      {badge.earned && badge.redeemed && (
                        <div className="text-xs text-green-400 mt-1">✓ Redeemed</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Redeem Modal */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 border border-yellow-500/30 rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-yellow-300">Redeem Badges</h3>
              <button
                onClick={() => setShowRedeemModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {badges.filter(b => b.earned && !b.redeemed).map((badge) => (
                <div key={badge.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{badge.icon}</div>
                    <div>
                      <div className="text-white font-medium">{badge.name}</div>
                      <div className="text-sm text-gray-300">
                        {badge.name.includes('Master') ? '100 coins' : 
                         badge.name.includes('Streak') ? '75 coins' : 
                         badge.name.includes('First') ? '25 coins' : '50 coins'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => redeemBadge(badge.id)}
                    className="bg-yellow-500/80 px-4 py-2 rounded-lg text-white font-bold hover:bg-yellow-400/80 transition-all"
                  >
                    Redeem
                  </button>
                </div>
              ))}
              
              {badges.filter(b => b.earned && !b.redeemed).length === 0 && (
                <div className="text-center py-4 text-gray-400">
                  <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No badges available for redemption</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;