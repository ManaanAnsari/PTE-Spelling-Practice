// Socket connection
const socket = io();

// Game state
let gameState = {
    playerName: '',
    roomId: '',
    isHost: false,
    currentWordIndex: 0,
    words: [],
    currentWord: '',
    myScore: { correct: 0, incorrect: 0, total: 0 },
    opponentScore: { correct: 0, incorrect: 0, total: 0 },
    isChecked: false,
    gameStarted: false,
    gameEnded: false,
    incorrectWords: [],
    dictionaryCache: {}
};

// DOM elements
const screens = {
    mainMenu: document.getElementById('main-menu'),
    createRoom: document.getElementById('create-room'),
    joinRoom: document.getElementById('join-room'),
    waitingRoom: document.getElementById('waiting-room'),
    gameScreen: document.getElementById('game-screen'),
    resultsScreen: document.getElementById('results-screen')
};

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadDictionaryCache();
    showScreen('mainMenu');
});

// Load dictionary cache from localStorage or JSON file
async function loadDictionaryCache() {
    try {
        // Try to load from localStorage first
        const cachedData = localStorage.getItem('spellingGameDictionary');
        if (cachedData) {
            gameState.dictionaryCache = JSON.parse(cachedData);
            console.log(`Loaded ${Object.keys(gameState.dictionaryCache).length} cached definitions from localStorage`);
            return;
        }

        // Try to load from JSON file
        const response = await fetch('dictionary.json');
        if (response.ok) {
            gameState.dictionaryCache = await response.json();
            console.log(`Loaded ${Object.keys(gameState.dictionaryCache).length} cached definitions from file`);
        } else {
            gameState.dictionaryCache = {};
            console.log('No existing dictionary cache found, starting fresh');
        }
    } catch (error) {
        console.log('No dictionary cache found, starting fresh');
        gameState.dictionaryCache = {};
    }
}

// Screen management
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Event listeners setup
function setupEventListeners() {
    // Main menu
    document.getElementById('create-room-btn').addEventListener('click', () => {
        const playerName = document.getElementById('player-name').value.trim();
        if (!playerName) {
            alert('Please enter your name!');
            return;
        }
        gameState.playerName = playerName;
        showScreen('createRoom');
    });

    document.getElementById('join-room-btn').addEventListener('click', () => {
        const playerName = document.getElementById('player-name').value.trim();
        if (!playerName) {
            alert('Please enter your name!');
            return;
        }
        gameState.playerName = playerName;
        showScreen('joinRoom');
    });

    // Create room
    document.getElementById('create-btn').addEventListener('click', () => {
        const wordCountInput = document.getElementById('word-count');
        const wordCount = parseInt(wordCountInput.value);
        
        if (!wordCount || wordCount < 1 || wordCount > 1000) {
            alert('Please enter a valid number of words (1-1000)!');
            wordCountInput.focus();
            return;
        }
        
        socket.emit('createRoom', {
            playerName: gameState.playerName,
            wordCount: wordCount
        });
    });

    document.getElementById('back-from-create').addEventListener('click', () => {
        showScreen('mainMenu');
    });

    // Join room
    document.getElementById('join-btn').addEventListener('click', () => {
        const roomId = document.getElementById('room-id-input').value.trim().toUpperCase();
        if (!roomId) {
            alert('Please enter a Room ID!');
            return;
        }
        console.log('Attempting to join room:', roomId, 'with name:', gameState.playerName);
        socket.emit('joinRoom', {
            roomId: roomId,
            playerName: gameState.playerName
        });
    });

    document.getElementById('back-from-join').addEventListener('click', () => {
        showScreen('mainMenu');
    });

    // Waiting room
    document.getElementById('ready-btn').addEventListener('click', () => {
        console.log('Ready button clicked, emitting playerReady');
        socket.emit('playerReady');
        document.getElementById('ready-btn').disabled = true;
        document.getElementById('ready-btn').textContent = 'Waiting...';
    });

    document.getElementById('leave-room-btn').addEventListener('click', () => {
        socket.disconnect();
        socket.connect();
        resetGameScores(); // Reset scores immediately
        showScreen('mainMenu');
        resetGameState();
    });

    // Game controls
    document.getElementById('speak-btn').addEventListener('click', speakWord);
    document.getElementById('check-btn').addEventListener('click', checkAnswer);
    document.getElementById('next-btn').addEventListener('click', nextWord);

    // Input handling
    document.getElementById('user-input').addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (!gameState.isChecked && !document.getElementById('user-input').disabled) {
                checkAnswer();
            } else if (gameState.isChecked && !document.getElementById('next-btn').disabled) {
                nextWord();
            }
        }
    });

    // Add global keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // Only activate shortcuts when in game screen
        if (!screens.gameScreen.classList.contains('active')) return;
        
        // Space key to speak word (works everywhere in game screen, including input field)
        if (event.key === ' ') {
            event.preventDefault();
            speakWord();
        }
        
        // Enter key when checked to go to next word
        if (event.key === 'Enter' && gameState.isChecked && !document.getElementById('next-btn').disabled) {
            event.preventDefault();
            nextWord();
        }
    });

    // Results screen
    document.getElementById('play-again-btn').addEventListener('click', () => {
        socket.disconnect();
        socket.connect();
        showScreen('mainMenu');
        resetGameState();
    });

    document.getElementById('main-menu-btn').addEventListener('click', () => {
        socket.disconnect();
        socket.connect();
        showScreen('mainMenu');
        resetGameState();
    });
}

// Socket event handlers
socket.on('roomCreated', (data) => {
    // Reset game state for new room
    resetGameScores();
    
    gameState.roomId = data.roomId;
    gameState.isHost = data.isHost;
    
    document.getElementById('current-room-id').textContent = data.roomId;
    document.getElementById('current-word-count').textContent = data.wordCount;
    document.getElementById('player1-status').querySelector('.player-name').textContent = gameState.playerName + ' (Host)';
    
    // Reset player statuses
    document.getElementById('player2-status').querySelector('.player-name').textContent = 'Waiting for player...';
    document.getElementById('player1-status').querySelector('.ready-status').textContent = '❌ Not Ready';
    document.getElementById('player1-status').querySelector('.ready-status').style.color = '#f44336';
    document.getElementById('player2-status').querySelector('.ready-status').textContent = '❌ Not Ready';
    document.getElementById('player2-status').querySelector('.ready-status').style.color = '#f44336';
    
    // Keep ready button disabled until second player joins
    document.getElementById('ready-btn').disabled = true;
    document.getElementById('ready-btn').textContent = 'Ready';
    
    showScreen('waitingRoom');
});

socket.on('roomJoined', (data) => {
    console.log('Room joined event received:', data);
    
    // Reset game state for new room
    resetGameScores();
    
    gameState.roomId = data.roomId;
    gameState.isHost = data.isHost;
    
    document.getElementById('current-room-id').textContent = data.roomId;
    document.getElementById('current-word-count').textContent = data.wordCount;
    document.getElementById('player2-status').querySelector('.player-name').textContent = gameState.playerName;
    
    // Reset player statuses
    document.getElementById('player1-status').querySelector('.ready-status').textContent = '❌ Not Ready';
    document.getElementById('player1-status').querySelector('.ready-status').style.color = '#f44336';
    document.getElementById('player2-status').querySelector('.ready-status').textContent = '❌ Not Ready';
    document.getElementById('player2-status').querySelector('.ready-status').style.color = '#f44336';
    
    // Keep ready button disabled until both players are present
    document.getElementById('ready-btn').disabled = true;
    document.getElementById('ready-btn').textContent = 'Ready';
    
    showScreen('waitingRoom');
});

socket.on('playerJoined', (data) => {
    console.log('Player joined event received:', data);
    
    // Enable ready button now that both players are in the room
    document.getElementById('ready-btn').disabled = false;
    console.log('Ready button enabled');
    
    if (gameState.isHost) {
        document.getElementById('player2-status').querySelector('.player-name').textContent = data.playerName;
    } else {
        document.getElementById('player1-status').querySelector('.player-name').textContent = 'Host';
        document.getElementById('player2-status').querySelector('.player-name').textContent = gameState.playerName;
        // Also enable ready button for the joining player
        document.getElementById('ready-btn').disabled = false;
    }
});

socket.on('playerReadyUpdate', (data) => {
    console.log('Player ready update received:', data);
    
    const statusElement = data.playerId === socket.id ? 
        (gameState.isHost ? document.getElementById('player1-status') : document.getElementById('player2-status')) :
        (gameState.isHost ? document.getElementById('player2-status') : document.getElementById('player1-status'));
    
    statusElement.querySelector('.ready-status').textContent = '✅ Ready';
    statusElement.querySelector('.ready-status').style.color = '#4CAF50';
});

socket.on('gameStarted', (data) => {
    gameState.words = data.words;
    gameState.gameStarted = true;
    gameState.currentWordIndex = 0;
    
    document.getElementById('total-words').textContent = data.totalWords;
    document.getElementById('my-name').textContent = gameState.playerName;
    
    loadNextWord();
    showScreen('gameScreen');
});

socket.on('scoreUpdate', (data) => {
    if (data.playerId === socket.id) {
        // Update my score (this shouldn't happen as we update locally)
        return;
    } else {
        // Update opponent score
        gameState.opponentScore = data.score;
        updateOpponentDisplay(data);
    }
});

socket.on('gameEnded', (data) => {
    gameState.gameEnded = true;
    showResults(data);
});

socket.on('roomError', (message) => {
    alert(message);
    showScreen('mainMenu');
});

socket.on('playerLeft', (data) => {
    alert(`${data.playerName} left the room.`);
    showScreen('mainMenu');
    resetGameState();
});

// Game functions
function loadNextWord() {
    if (gameState.currentWordIndex >= gameState.words.length) {
        // Player finished
        return;
    }

    gameState.currentWord = gameState.words[gameState.currentWordIndex];
    document.getElementById('current-word').textContent = '?';
    document.getElementById('current-word-number').textContent = gameState.currentWordIndex + 1;
    
    const userInput = document.getElementById('user-input');
    userInput.value = '';
    userInput.disabled = false;
    userInput.focus();
    
    document.getElementById('check-btn').disabled = false;
    document.getElementById('next-btn').disabled = true;
    document.getElementById('result').innerHTML = '';
    
    gameState.isChecked = false;
}

async function checkAnswer() {
    if (gameState.isChecked) return;

    const userInput = document.getElementById('user-input');
    const userAnswer = userInput.value.trim().toLowerCase();
    const correctAnswer = gameState.currentWord.toLowerCase();
    const isCorrect = userAnswer === correctAnswer;

    // Update local score
    if (isCorrect) {
        gameState.myScore.correct++;
    } else {
        gameState.myScore.incorrect++;
        // Store incorrect word
        gameState.incorrectWords.push({
            correct: gameState.currentWord,
            userSpelling: userInput.value.trim()
        });
    }
    gameState.myScore.total++;

    // Update display
    updateMyDisplay();

    // Show initial result
    const resultElement = document.getElementById('result');
    let resultText = '';
    if (isCorrect) {
        resultText = 'Correct! ✅';
        resultElement.innerHTML = `<div class="correct">${resultText}</div><div class="loading-meaning">Loading definition...</div>`;
    } else {
        resultText = `Incorrect! ❌<br>Correct spelling: ${gameState.currentWord}`;
        resultElement.innerHTML = `<div class="incorrect">${resultText}</div><div class="loading-meaning">Loading definition...</div>`;
    }

    // Fetch and display word meaning
    const meaningData = await fetchWordMeaning(gameState.currentWord);
    const meaningHtml = displayWordMeaning(meaningData);
    
    if (isCorrect) {
        resultElement.innerHTML = `<div class="correct">${resultText}</div>${meaningHtml}`;
    } else {
        resultElement.innerHTML = `<div class="incorrect">${resultText}</div>${meaningHtml}`;
    }

    // Send to server
    socket.emit('submitAnswer', {
        userAnswer: userInput.value.trim(),
        currentWord: gameState.currentWord,
        isCorrect: isCorrect
    });

    gameState.isChecked = true;
    gameState.currentWordIndex++;
    
    userInput.disabled = true;
    document.getElementById('check-btn').disabled = true;
    document.getElementById('next-btn').disabled = false;
}

function nextWord() {
    if (gameState.currentWordIndex >= gameState.words.length) {
        // Game finished for this player
        document.getElementById('user-input').disabled = true;
        document.getElementById('check-btn').disabled = true;
        document.getElementById('next-btn').disabled = true;
        document.getElementById('current-word').textContent = 'Waiting for opponent...';
        return;
    }

    loadNextWord();
}

function speakWord() {
    if (gameState.currentWord) {
        const utterance = new SpeechSynthesisUtterance(gameState.currentWord);
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
    }
}

function updateMyDisplay() {
    document.getElementById('my-correct').textContent = gameState.myScore.correct;
    document.getElementById('my-wrong').textContent = gameState.myScore.incorrect;
    
    const progress = (gameState.myScore.total / gameState.words.length) * 100;
    document.getElementById('my-progress').style.width = progress + '%';
}

function updateOpponentDisplay(data) {
    document.getElementById('opponent-name').textContent = data.playerName;
    document.getElementById('opponent-correct').textContent = data.score.correct;
    document.getElementById('opponent-wrong').textContent = data.score.incorrect;
    
    const progress = (data.score.total / gameState.words.length) * 100;
    document.getElementById('opponent-progress').style.width = progress + '%';
}

function showResults(results) {
    const isWinner = results.player1.id === socket.id ? results.player1.isWinner : results.player2.isWinner;
    const myResults = results.player1.id === socket.id ? results.player1 : results.player2;
    const opponentResults = results.player1.id === socket.id ? results.player2 : results.player1;

    // Winner announcement with animation
    const winnerAnnouncement = document.getElementById('winner-announcement');
    if (results.isDraw) {
        winnerAnnouncement.innerHTML = '<h1 class="draw">🤝 It\'s a Draw!</h1>';
        winnerAnnouncement.className = 'draw-animation';
    } else if (isWinner) {
        winnerAnnouncement.innerHTML = '<h1 class="winner">🎉 You Win!</h1>';
        winnerAnnouncement.className = 'winner-animation';
        createConfetti();
    } else {
        winnerAnnouncement.innerHTML = '<h1 class="loser">😔 You Lose</h1>';
        winnerAnnouncement.className = 'loser-animation';
    }

    // Fill in results
    fillPlayerResults('player1', myResults, 'You');
    fillPlayerResults('player2', opponentResults, 'Opponent');

    showScreen('resultsScreen');
}

function fillPlayerResults(playerId, playerData, displayName) {
    const accuracy = playerData.score.total > 0 ? 
        ((playerData.score.correct / playerData.score.total) * 100).toFixed(1) : 0;

    document.getElementById(`${playerId}-final-name`).textContent = displayName;
    document.getElementById(`${playerId}-final-correct`).textContent = playerData.score.correct;
    document.getElementById(`${playerId}-final-wrong`).textContent = playerData.score.incorrect;
    document.getElementById(`${playerId}-final-accuracy`).textContent = accuracy + '%';

    const mistakesList = document.getElementById(`${playerId}-mistakes`);
    mistakesList.innerHTML = '';
    
    // Use local mistakes for "You", server data for opponent
    const mistakes = displayName === 'You' ? gameState.incorrectWords : (playerData.incorrectWords || []);
    
    if (mistakes.length === 0) {
        mistakesList.innerHTML = '<li class="no-mistakes">Perfect! No mistakes! 🌟</li>';
    } else {
        mistakes.forEach(mistake => {
            const li = document.createElement('li');
            li.innerHTML = `${mistake.correct} <span class="user-spelling">(wrote: ${mistake.userSpelling})</span>`;
            mistakesList.appendChild(li);
        });
    }
}

// Confetti animation
function createConfetti() {
    const confettiContainer = document.getElementById('confetti');
    confettiContainer.innerHTML = '';

    for (let i = 0; i < 100; i++) {
        const confettiPiece = document.createElement('div');
        confettiPiece.className = 'confetti-piece';
        confettiPiece.style.left = Math.random() * 100 + '%';
        confettiPiece.style.backgroundColor = getRandomColor();
        confettiPiece.style.animationDelay = Math.random() * 3 + 's';
        confettiContainer.appendChild(confettiPiece);
    }

    setTimeout(() => {
        confettiContainer.innerHTML = '';
    }, 5000);
}

function getRandomColor() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Fetch word meaning from cache or API
async function fetchWordMeaning(word) {
    const wordKey = word.toLowerCase();
    
    // Check cache first
    if (gameState.dictionaryCache[wordKey]) {
        console.log(`Found definition for "${word}" in cache`);
        return gameState.dictionaryCache[wordKey];
    }
    
    console.log(`Fetching definition for "${word}" from API`);
    
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        
        if (!response.ok) {
            // Cache the null result to avoid repeated API calls for invalid words
            gameState.dictionaryCache[wordKey] = null;
            saveDictionaryToLocalStorage();
            return null;
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            const wordData = data[0];
            
            // Get the first meaning and definition
            if (wordData.meanings && wordData.meanings.length > 0) {
                const meaning = wordData.meanings[0];
                const definition = meaning.definitions && meaning.definitions.length > 0 
                    ? meaning.definitions[0].definition 
                    : null;
                
                const meaningData = {
                    partOfSpeech: meaning.partOfSpeech || '',
                    definition: definition || '',
                    phonetic: wordData.phonetic || '',
                    example: meaning.definitions[0]?.example || ''
                };
                
                // Cache the result
                gameState.dictionaryCache[wordKey] = meaningData;
                saveDictionaryToLocalStorage();
                console.log(`Cached definition for "${word}"`);
                
                return meaningData;
            }
        }
        
        // Cache null result if no valid data found
        gameState.dictionaryCache[wordKey] = null;
        saveDictionaryToLocalStorage();
        return null;
    } catch (error) {
        console.error('Error fetching word meaning:', error);
        return null;
    }
}

// Display word meaning
function displayWordMeaning(meaningData) {
    if (!meaningData) {
        return '<div class="word-meaning"><em>Definition not available</em></div>';
    }
    
    let meaningHtml = '<div class="word-meaning">';
    meaningHtml += `<strong>Definition:</strong> `;
    
    if (meaningData.partOfSpeech) {
        meaningHtml += `<em>(${meaningData.partOfSpeech})</em> `;
    }
    
    meaningHtml += meaningData.definition;
    
    if (meaningData.phonetic) {
        meaningHtml += `<br><strong>Pronunciation:</strong> ${meaningData.phonetic}`;
    }
    
    if (meaningData.example) {
        meaningHtml += `<br><strong>Example:</strong> "${meaningData.example}"`;
    }
    
    meaningHtml += '</div>';
    
    return meaningHtml;
}

// Save dictionary to localStorage
function saveDictionaryToLocalStorage() {
    try {
        localStorage.setItem('spellingGameDictionary', JSON.stringify(gameState.dictionaryCache));
    } catch (error) {
        console.error('Error saving dictionary to localStorage:', error);
    }
}

// Reset only the scores and game progress (not room info)
function resetGameScores() {
    gameState.currentWordIndex = 0;
    gameState.words = [];
    gameState.currentWord = '';
    gameState.myScore = { correct: 0, incorrect: 0, total: 0 };
    gameState.opponentScore = { correct: 0, incorrect: 0, total: 0 };
    gameState.isChecked = false;
    gameState.gameStarted = false;
    gameState.gameEnded = false;
    gameState.incorrectWords = [];
    
    // Reset game screen displays
    document.getElementById('my-correct').textContent = '0';
    document.getElementById('my-wrong').textContent = '0';
    document.getElementById('opponent-correct').textContent = '0';
    document.getElementById('opponent-wrong').textContent = '0';
    document.getElementById('my-progress').style.width = '0%';
    document.getElementById('opponent-progress').style.width = '0%';
    document.getElementById('current-word').textContent = '?';
    document.getElementById('current-word-number').textContent = '1';
    document.getElementById('result').innerHTML = '';
    
    // Reset opponent name
    document.getElementById('opponent-name').textContent = 'Opponent';
    
    // Reset input state
    const userInput = document.getElementById('user-input');
    userInput.value = '';
    userInput.disabled = false;
    document.getElementById('check-btn').disabled = false;
    document.getElementById('next-btn').disabled = true;
}

function resetGameState() {
    gameState = {
        playerName: gameState.playerName, // Keep the name
        roomId: '',
        isHost: false,
        currentWordIndex: 0,
        words: [],
        currentWord: '',
        myScore: { correct: 0, incorrect: 0, total: 0 },
        opponentScore: { correct: 0, incorrect: 0, total: 0 },
        isChecked: false,
        gameStarted: false,
        gameEnded: false,
        incorrectWords: [],
        dictionaryCache: gameState.dictionaryCache // Keep the dictionary cache
    };
} 