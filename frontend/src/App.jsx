import React, { useState, useEffect } from 'react';
import { Upload, BookOpen, Trophy, Coins, Flame, CheckCircle, XCircle, Star, Target, Brain } from 'lucide-react';

const App = () => {
  // API Configuration
  const API_BASE_URL = 'http://localhost:3001/api';
  
  // State management
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTopic, setCurrentTopic] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [currentExplanation, setCurrentExplanation] = useState('');
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

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/stats`);
      if (response.ok) {
        const stats = await response.json();
        setCoins(stats.coins);
        setStreak(stats.streak);
        setBadges(stats.badges || []);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
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
        setCurrentExplanation(data.explanation);
        setKeyTakeaways(data.keyTakeaways || []);
        setIsLearning(true);
        setProgress(0);
        
        await getNextQuestion(data.sessionId);
      } else {
        setError(data.error || 'Failed to process learning content');
      }
    } catch (error) {
      setError('Network error. Please check that the backend server is running on port 3001.');
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
    setCurrentExplanation('');
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
              <h1 className="text-2xl font-black text-yellow-300">MindTrail</h1>
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
            <div className="text-purple-200 text-sm">Demo Mode</div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {!isLearning ? (
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

            {/* Explanation */}
            <div className="bg-black/30 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-blue-300">Knowledge Crystal</h3>
              </div>
              <p className="text-lg text-blue-100 leading-relaxed whitespace-pre-wrap">{currentExplanation}</p>
            </div>

            {/* Quiz */}
            {currentQuestion && (
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;