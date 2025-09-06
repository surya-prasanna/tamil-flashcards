  fetch('flashcards.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Update gameState instead of global variables
      gameState.flashcards = data;
      gameState.filteredFlashcards = data;
      showCard(); // Don't pass current since it's in gameState
      console.log('Flashcards loaded successfully:', data.length, 'cards');
    })
    .catch(err => {
      console.error('Failed to load flashcards:', err);
      // Add fallback data here if needed
    });

  let gameState = {
    flashcards: [],
    filteredFlashcards: [],
    current: 0,
    
    // Player Stats
    level: 1,
    xp: 0,
    totalXP: 0,
    streak: 0,
    dailyStreak: 1,
    
    // Learning Analytics
    totalAttempts: 0,
    correctAnswers: 0,
    sessionAttempts: 0,
    sessionCorrect: 0,
    
    // AI Learning System
    playerDifficulty: 1, // 1-5 scale
    adaptiveMode: true,
    
    // Daily Challenge
    dailyChallenge: {
      target: 5,
      progress: 0,
      completed: false,
      reward: 50
    },
    
    // Achievements
    achievements: [],
    
    // Last session data
    lastPlayed: null
  };

  // XP and Level System
  const XP_LEVELS = [100, 250, 500, 1000, 1750, 2750, 4250, 6500, 9750, 14250, 20250]; // XP needed for each level

  function getXPForLevel(level) {
    return XP_LEVELS[level - 1] || XP_LEVELS[XP_LEVELS.length - 1];
  }

  function calculateLevel(totalXP) {
    for (let i = 0; i < XP_LEVELS.length; i++) {
      if (totalXP < XP_LEVELS[i]) {
        return i + 1;
      }
    }
    return XP_LEVELS.length + 1;
  }

  // AI-Powered Spaced Repetition Algorithm
  function calculateCardPriority(card) {
    const masteryWeight = 1 - (card.mastery / 100);
    const difficultyWeight = card.difficulty / 5;
    const recencyWeight = card.attempts === 0 ? 1 : 0.5;
    
    return masteryWeight * 0.5 + difficultyWeight * 0.3 + recencyWeight * 0.2;
  }

  function getNextCard() {
    // AI-powered card selection based on spaced repetition
    const availableCards = gameState.filteredFlashcards.filter(card => card.mastery < 90);
    
    if (availableCards.length === 0) {
      // All cards mastered, cycle through all cards
      return gameState.filteredFlashcards[gameState.current % gameState.filteredFlashcards.length];
    }
    
    // Calculate priorities for all available cards
    const cardPriorities = availableCards.map(card => ({
      card,
      priority: calculateCardPriority(card)
    }));
    
    // Sort by priority (higher = more likely to be selected)
    cardPriorities.sort((a, b) => b.priority - a.priority);
    
    // Use weighted random selection from top 3 highest priority cards
    const topCandidates = cardPriorities.slice(0, Math.min(3, cardPriorities.length));
    const randomIndex = Math.floor(Math.random() * topCandidates.length);
    
    return topCandidates[randomIndex].card;
  }

  // XP and Achievement System
  function awardXP(amount, reason = '') {
    gameState.xp += amount;
    gameState.totalXP += amount;
    
    // Show XP gain animation
    showXPGain(amount, reason);
    
    // Check for level up
    const newLevel = calculateLevel(gameState.totalXP);
    if (newLevel > gameState.level) {
      levelUp(newLevel);
    }
    
    updateXPDisplay();
    updateStats();
  }

  function showXPGain(amount, reason) {
    const xpGain = document.createElement('div');
    xpGain.className = 'xp-gain';
    xpGain.textContent = `+${amount} XP${reason ? ` (${reason})` : ''}`;
    xpGain.style.left = '50%';
    xpGain.style.top = '30%';
    xpGain.style.transform = 'translateX(-50%)';
    document.body.appendChild(xpGain);
    
    setTimeout(() => {
      document.body.removeChild(xpGain);
    }, 2000);
  }

  function levelUp(newLevel) {
    gameState.level = newLevel;
    gameState.xp = 0; // Reset current level XP
    
    showAchievement(`🎉 Level ${newLevel}!`, `You've reached level ${newLevel}!`);
    
    // Award bonus XP for leveling up
    setTimeout(() => {
      awardXP(50, 'Level Up Bonus');
    }, 1000);
  }

  function showAchievement(title, description) {
    const toast = document.getElementById('achievementToast');
    toast.querySelector('.achievement-text').textContent = title;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  // Enhanced pronunciation scoring with AI feedback
  function getAdvancedFeedback(score, expected, actual) {
    if (score >= 95) return { message: "🌟 Perfect pronunciation!", xp: 25, level: "expert" };
    if (score >= 85) return { message: "🎉 Excellent! Almost perfect!", xp: 20, level: "advanced" };
    if (score >= 75) return { message: "👍 Great job! Very clear!", xp: 15, level: "good" };
    if (score >= 60) return { message: "💪 Good attempt! Keep practicing!", xp: 10, level: "okay" };
    if (score >= 40) return { message: "🎯 Getting there! Try again!", xp: 5, level: "needs-work" };
    return { message: "😊 Keep practicing! You can do it!", xp: 2, level: "beginner" };
  }

  // Update AI difficulty based on performance
  function updateAIDifficulty() {
    const recentPerformance = gameState.sessionAttempts > 0 ? 
      (gameState.sessionCorrect / gameState.sessionAttempts) * 100 : 0;
    
    if (recentPerformance > 80 && gameState.sessionAttempts >= 5) {
      gameState.playerDifficulty = Math.min(5, gameState.playerDifficulty + 0.5);
    } else if (recentPerformance < 50 && gameState.sessionAttempts >= 3) {
      gameState.playerDifficulty = Math.max(1, gameState.playerDifficulty - 0.5);
    }
    
    updateDifficultyDisplay();
  }

  function updateDifficultyDisplay() {
    const dots = document.querySelectorAll('.difficulty-dot');
    const level = Math.round(gameState.playerDifficulty);
    
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index < level);
    });
    
    const labels = ['Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];
    const tips = [
      'Building basic vocabulary foundation',
      'Practicing common words and phrases',
      'Challenging yourself with longer words',
      'Mastering complex pronunciations',
      'Perfecting advanced Tamil expressions'
    ];
    
    document.getElementById('difficultyLabel').textContent = labels[level - 1] || 'Expert';
    document.getElementById('aiTip').textContent = tips[level - 1] || tips[4];
  }

  // Daily Challenge System
  function updateDailyChallenge(perfect = false) {
    if (perfect && !gameState.dailyChallenge.completed) {
      gameState.dailyChallenge.progress = Math.min(
        gameState.dailyChallenge.target, 
        gameState.dailyChallenge.progress + 1
      );
      
      const progressPercent = (gameState.dailyChallenge.progress / gameState.dailyChallenge.target) * 100;
      document.getElementById('challengeFill').style.width = `${progressPercent}%`;
      document.getElementById('challengeProgress').textContent = 
        `${gameState.dailyChallenge.progress}/${gameState.dailyChallenge.target}`;
      
      if (gameState.dailyChallenge.progress >= gameState.dailyChallenge.target) {
        gameState.dailyChallenge.completed = true;
        showAchievement('🎯 Daily Challenge Complete!', 'Challenge completed!');
        setTimeout(() => {
          awardXP(gameState.dailyChallenge.reward, 'Daily Challenge');
        }, 1000);
      }
    }
  }

  // Core Functions
  function initializeApp() {
    gameState.filteredFlashcards = gameState.flashcards;
    gameState.current = 0;
    showCard();
    updateXPDisplay();
    updateStats();
    updateDifficultyDisplay();
    
    // Initialize daily challenge
    const today = new Date().toDateString();
    if (gameState.lastPlayed !== today) {
      // Reset daily challenge
      gameState.dailyChallenge.progress = 0;
      gameState.dailyChallenge.completed = false;
      gameState.lastPlayed = today;
    }
    
    updateDailyChallenge();
  }

  function showCard() {
    const card = getNextCard();
    const flashcardElement = document.getElementById('flashcard');
    
    if (!card) return;
    
    // Find current card index
    gameState.current = gameState.filteredFlashcards.indexOf(card);
    
    // Add flip animation
    flashcardElement.classList.remove('flip');
    void flashcardElement.offsetWidth;
    flashcardElement.classList.add('flip');
    
    // Update content
    document.getElementById('emoji').textContent = card.emoji;
    document.getElementById('tamil').textContent = card.tamil;
    document.getElementById('roman').textContent = card.roman;
    document.getElementById('english').textContent = card.english;
    
    // Update difficulty indicator
    const difficultyLabels = ['Easy', 'Medium', 'Hard', 'Expert', 'Master'];
    document.getElementById('cardDifficulty').textContent = 
      difficultyLabels[card.difficulty - 1] || 'Easy';
    
    // Update mastery progress
    document.getElementById('masteryFill').style.width = `${card.mastery}%`;
    
    updateAccuracyMeter(0);
    resetFeedback();
  }

  function updateXPDisplay() {
    const currentLevelXP = gameState.level > 1 ? getXPForLevel(gameState.level - 1) : 0;
    const nextLevelXP = getXPForLevel(gameState.level);
    const progressXP = gameState.totalXP - currentLevelXP;
    const neededXP = nextLevelXP - currentLevelXP;
    
    const progressPercent = (progressXP / neededXP) * 100;
    
    document.getElementById('playerLevel').textContent = gameState.level;
    document.getElementById('xpBar').style.width = `${Math.min(100, progressPercent)}%`;
    document.getElementById('currentXP').textContent = progressXP;
    document.getElementById('nextLevelXP').textContent = neededXP;
  }

  function updateStats() {
    document.getElementById('streakStat').textContent = gameState.dailyStreak;
    
    const avgAccuracy = gameState.totalAttempts > 0 ? 
      Math.round((gameState.correctAnswers / gameState.totalAttempts) * 100) : 0;
    document.getElementById('accuracyStat').textContent = `${avgAccuracy}%`;
    
    const masteredWords = gameState.flashcards.filter(card => card.mastery >= 90).length;
    document.getElementById('masteredStat').textContent = masteredWords;
    
    document.getElementById('totalXPStat').textContent = gameState.totalXP;
  }

  function updateAccuracyMeter(accuracy) {
    const circle = document.getElementById('accuracyCircle');
    const text = document.getElementById('accuracyText');
    const angle = (accuracy / 100) * 360;
    
    circle.style.setProperty('--accuracy-angle', `${angle}deg`);
    text.textContent = `${accuracy}%`;
    
    // Update color based on accuracy
    let color = '#ef4444'; // red
    if (accuracy >= 80) color = '#22c55e'; // green
    else if (accuracy >= 60) color = '#eab308'; // yellow
    else if (accuracy >= 40) color = '#f97316'; // orange
    
    circle.style.background = `conic-gradient(from 0deg, ${color} 0deg, ${color} ${angle}deg, rgba(255, 255, 255, 0.2) ${angle}deg)`;
  }

  function resetFeedback() {
    document.getElementById('userInput').textContent = 'Press speak to try pronunciation';
    document.getElementById('feedback').textContent = 'Ready to practice!';
    document.getElementById('reaction').textContent = '🎯';
    updateAccuracyMeter(0);
  }

  // Enhanced Speech Recognition
  function startListening() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      document.getElementById('feedback').textContent = 'Speech recognition not supported in this browser';
      return;
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'ta-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    const speakBtn = document.getElementById('speakBtn');
    const flashcardElement = document.getElementById('flashcard');
    const currentCard = gameState.filteredFlashcards[gameState.current];

    speakBtn.classList.add('listening');
    speakBtn.innerHTML = '<span class="spinner"></span><span>Listening...</span>';

    recognition.onstart = () => {
      document.getElementById('feedback').textContent = '🎤 Listening... Speak now!';
      document.getElementById('reaction').textContent = '👂';
    };

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      document.getElementById('userInput').innerHTML = `You said: <em>"${spokenText}"</em>`;

      const expected = currentCard.tamil;
      const score = compareTamil(expected, spokenText);
      const feedback = getAdvancedFeedback(score, expected, spokenText);
      
      // Update card statistics
      currentCard.attempts++;
      gameState.totalAttempts++;
      gameState.sessionAttempts++;
      
      // Update accuracy meter
      updateAccuracyMeter(score);
      
      // Clear previous animations
      flashcardElement.classList.remove('success', 'error');

      if (score >= 75) {
        // Success
        currentCard.successes++;
        gameState.correctAnswers++;
        gameState.sessionCorrect++;
        gameState.streak++;
        
        // Update mastery (more sophisticated algorithm)
        const masteryGain = Math.min(15, score / 5);
        currentCard.mastery = Math.min(100, currentCard.mastery + masteryGain);
        document.getElementById('masteryFill').style.width = `${currentCard.mastery}%`;
        
        flashcardElement.classList.add('success');
        document.getElementById('feedback').textContent = feedback.message;
        document.getElementById('reaction').textContent = '🌟';
        
        awardXP(feedback.xp, `${score}% accuracy`);
        
        // Check for perfect pronunciation
        if (score >= 90) {
          updateDailyChallenge(true);
        }
        
        setTimeout(() => {
          nextCard();
        }, 2000);
        
      } else {
        // Needs improvement
        gameState.streak = Math.max(0, gameState.streak - 1);
        
        // Smaller mastery penalty
        currentCard.mastery = Math.max(0, currentCard.mastery - 2);
        document.getElementById('masteryFill').style.width = `${currentCard.mastery}%`;
        
        if (score < 40) {
          flashcardElement.classList.add('error');
        }
        
        document.getElementById('feedback').textContent = feedback.message;
        document.getElementById('reaction').textContent = score >= 60 ? '💪' : '🎯';
        
        awardXP(feedback.xp, 'Practice attempt');
      }
      
      updateAIDifficulty();
      updateStats();
    };

    recognition.onerror = (event) => {
      let errorMessage = 'Recognition error: ';
      switch(event.error) {
        case 'no-speech':
          errorMessage += 'No speech detected. Try speaking louder.';
          break;
        case 'audio-capture':
          errorMessage += 'Microphone not accessible.';
          break;
        case 'not-allowed':
          errorMessage += 'Microphone access denied.';
          break;
        default:
          errorMessage += event.error;
      }
      document.getElementById('feedback').textContent = errorMessage;
      document.getElementById('reaction').textContent = '❌';
    };

    recognition.onend = () => {
      speakBtn.classList.remove('listening');
      speakBtn.innerHTML = '<span>🎙️</span><span>Speak</span>';
    };

    recognition.start();
  }

  // Utility Functions
  function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  function compareTamil(expected, actual) {
    const distance = levenshteinDistance(expected.trim(), actual.trim());
    const maxLength = Math.max(expected.length, actual.length);
    if (maxLength === 0) return 100;
    return Math.round(((maxLength - distance) / maxLength) * 100);
  }

  function speakTamil(text) {
    const msg = new SpeechSynthesisUtterance();
    msg.text = text;
    msg.lang = 'ta-IN';
    msg.rate = 0.8;
    msg.pitch = 1.1;
    window.speechSynthesis.speak(msg);
  }

  function nextCard() {
    gameState.current = (gameState.current + 1) % gameState.filteredFlashcards.length;
  
    // Show the card at the new current position
    const card = gameState.filteredFlashcards[gameState.current];
    const flashcardElement = document.getElementById('flashcard');
    
    if (!card) return;
    
    // Add flip animation
    flashcardElement.classList.remove('flip');
    void flashcardElement.offsetWidth;
    flashcardElement.classList.add('flip');
    
    // Update content
    document.getElementById('emoji').textContent = card.emoji;
    document.getElementById('tamil').textContent = card.tamil;
    document.getElementById('roman').textContent = card.roman;
    document.getElementById('english').textContent = card.english;
    
    // Update difficulty indicator (if you have this element)
    const difficultyLabels = ['Easy', 'Medium', 'Hard', 'Expert', 'Master'];
    const difficultyElement = document.getElementById('cardDifficulty');
    if (difficultyElement) {
      difficultyElement.textContent = difficultyLabels[card.difficulty - 1] || 'Easy';
    }
    
    // Update mastery progress (if you have this element)
    const masteryFill = document.getElementById('masteryFill');
    if (masteryFill) {
      masteryFill.style.width = `${card.mastery || 0}%`;
    }
    
    updateAccuracyMeter(0);
    resetFeedback();
  }

  function filterByCategory() {
    const selected = document.getElementById('categorySelect').value;
    if (selected === 'All') {
      gameState.filteredFlashcards = gameState.flashcards;
    } else {
      gameState.filteredFlashcards = gameState.flashcards.filter(card => card.category === selected);
    }
    gameState.current = 0;
    showCard();
  }

  // Manual Difficulty Adjustment
  function markCardEasy() {
    const currentCard = gameState.filteredFlashcards[gameState.current];
    if (currentCard) {
      currentCard.difficulty = Math.max(1, currentCard.difficulty - 1);
      currentCard.mastery = Math.min(100, currentCard.mastery + 10);
      awardXP(5, 'Easy feedback');
      showAchievement('👍 Noted!', 'This word is now easier for you');
      setTimeout(nextCard, 1000);
    }
  }

  function markCardHard() {
    const currentCard = gameState.filteredFlashcards[gameState.current];
    if (currentCard) {
      currentCard.difficulty = Math.min(5, currentCard.difficulty + 1);
      awardXP(2, 'Hard feedback');
      showAchievement('💪 Challenge accepted!', 'This word needs more practice');
    }
  }

  // Event Listeners
  document.addEventListener('DOMContentLoaded', () => {
    initializeApp();

    document.getElementById('hearBtn').addEventListener('click', () => {
      const currentCard = gameState.filteredFlashcards[gameState.current];
      if (currentCard) {
        speakTamil(currentCard.tamil);
      }
    });

    document.getElementById('speakBtn').addEventListener('click', startListening);
    document.getElementById('nextBtn').addEventListener('click', nextCard);
    document.getElementById('easyBtn').addEventListener('click', markCardEasy);
    document.getElementById('hardBtn').addEventListener('click', markCardHard);
    document.getElementById('categorySelect').addEventListener('change', filterByCategory);

    // Clean up animations
    const flashcardElement = document.getElementById('flashcard');
    flashcardElement.addEventListener('animationend', (e) => {
      if (e.animationName === 'successPulse' || e.animationName === 'errorShake') {
        flashcardElement.classList.remove('success', 'error');
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      switch(e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          nextCard();
          break;
        case 'h':
        case 'H':
          const currentCard = gameState.filteredFlashcards[gameState.current];
          if (currentCard) {
            speakTamil(currentCard.tamil);
          }
          break;
        case 's':
        case 'S':
          if (!document.getElementById('speakBtn').classList.contains('listening')) {
            startListening();
          }
          break;
        case '1':
          markCardEasy();
          break;
        case '2':
          markCardHard();
          break;
      }
    });
  });

// Authentication Logic
const loginBox = document.getElementById('loginBox');
const appContent = document.getElementById('appContent');
const authStatus = document.getElementById('authStatus');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const emailLoginBtn = document.getElementById('emailLoginBtn');
const emailSignupBtn = document.getElementById('emailSignupBtn');
const googleLoginBtn = document.getElementById('googleLoginBtn');

// Email login
emailLoginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!email || !password) {
    authStatus.textContent = '❌ Please fill in all fields';
    authStatus.style.color = '#ff6b6b';
    return;
  }

  emailLoginBtn.innerHTML = '<span class="spinner"></span> Signing in...';
  emailLoginBtn.disabled = true;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    authStatus.textContent = '✅ Welcome back!';
    authStatus.style.color = '#4caf50';
  } catch (error) {
    authStatus.textContent = `❌ ${error.message}`;
    authStatus.style.color = '#ff6b6b';
    emailLoginBtn.innerHTML = 'Sign In';
    emailLoginBtn.disabled = false;
  }
});

// Email signup
emailSignupBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!email || !password) {
    authStatus.textContent = '❌ Please fill in all fields';
    authStatus.style.color = '#ff6b6b';
    return;
  }

  if (password.length < 6) {
    authStatus.textContent = '❌ Password must be at least 6 characters';
    authStatus.style.color = '#ff6b6b';
    return;
  }

  emailSignupBtn.innerHTML = '<span class="spinner"></span> Creating account...';
  emailSignupBtn.disabled = true;

  try {
    await auth.createUserWithEmailAndPassword(email, password);
    authStatus.textContent = '✅ Account created successfully!';
    authStatus.style.color = '#4caf50';
  } catch (error) {
    authStatus.textContent = `❌ ${error.message}`;
    authStatus.style.color = '#ff6b6b';
    emailSignupBtn.innerHTML = 'Create Account';
    emailSignupBtn.disabled = false;
  }
});

// Google login
googleLoginBtn.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');

  googleLoginBtn.innerHTML = '<span class="spinner"></span> Connecting to Google...';
  googleLoginBtn.disabled = true;

  try {
    await auth.signInWithPopup(provider);
    authStatus.textContent = '✅ Google sign-in successful!';
    authStatus.style.color = '#4caf50';
  } catch (error) {
    authStatus.textContent = `❌ ${error.message}`;
    authStatus.style.color = '#ff6b6b';
    googleLoginBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Continue with Google
    `;
    googleLoginBtn.disabled = false;
  }
});

// Auth state observer
auth.onAuthStateChanged(user => {
  if (user) {
    loginBox.style.display = 'none';
    appContent.style.display = 'block';
    
    // Initialize app after login
    setTimeout(() => {
      initializeApp();
    }, 100);
  } else {
    loginBox.style.display = 'flex';
    appContent.style.display = 'none';
    authStatus.textContent = '';
  }
});

// Enter key support for login form
emailInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    passwordInput.focus();
  }
});

passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    emailLoginBtn.click();
  }
});