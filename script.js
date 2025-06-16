let words = [];
let currentWord = '';
let correctCount = 0;
let incorrectCount = 0;
let totalAsked = 0;
let totalWords = 0;
let selectedWordCount = 0; // Number of words user wants to test
let wordsToTest = []; // Subset of words to test
let isChecked = false;
let incorrectWords = [];
let dictionaryCache = {}; // Local cache for word definitions

// DOM elements
const currentWordElement = document.getElementById('current-word');
const userInput = document.getElementById('user-input');
const checkBtn = document.getElementById('check-btn');
const nextBtn = document.getElementById('next-btn');
const speakBtn = document.getElementById('speak-btn');
const correctCountElement = document.getElementById('correct-count');
const incorrectCountElement = document.getElementById('incorrect-count');
const totalElement = document.getElementById('total');
const totalIncorrectElement = document.getElementById('total-incorrect');
const remainingCountElement = document.getElementById('remaining-count');
const resultElement = document.getElementById('result');
const toggleIncorrectBtn = document.getElementById('toggle-incorrect-btn');
const incorrectWordsList = document.getElementById('incorrect-words-list');
const exportBtn = document.getElementById('export-btn');
const apiToggle = document.getElementById('api-toggle');

// Load dictionary cache from JSON file
async function loadDictionaryCache() {
    try {
        const response = await fetch('dictionary.json');
        if (response.ok) {
            dictionaryCache = await response.json();
            console.log(`Loaded ${Object.keys(dictionaryCache).length} cached definitions`);
        } else {
            // File doesn't exist, start with empty cache
            dictionaryCache = {};
            console.log('No existing dictionary cache found, starting fresh');
        }
    } catch (error) {
        console.log('No dictionary cache file found, starting fresh');
        dictionaryCache = {};
    }
}

// Save dictionary cache to JSON file
async function saveDictionaryCache() {
    try {
        // Create a blob with the JSON data
        const jsonData = JSON.stringify(dictionaryCache, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dictionary.json';
        a.style.display = 'none';
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Dictionary cache saved! Please place the downloaded file in your project folder.');
    } catch (error) {
        console.error('Error saving dictionary cache:', error);
    }
}

// Load words from file
async function loadWords() {
    try {
        // Load dictionary cache first
        await loadDictionaryCache();
        
        const response = await fetch('words.txt');
        const text = await response.text();
        words = text.split('\n')
            .map(word => word.trim())
            .filter(word => word.length > 0);
        totalWords = words.length;
        
        // Ask user how many words they want to test
        askForWordCount();
    } catch (error) {
        console.error('Error loading words:', error);
        resultElement.textContent = 'Error loading words. Please check the words.txt file.';
    }
}

// Ask user for number of words to test
function askForWordCount() {
    let count;
    do {
        const input = prompt(`How many words would you like to test? (Available: ${totalWords} words)`);
        
        // If user cancels, use all words
        if (input === null) {
            count = totalWords;
            break;
        }
        
        count = parseInt(input);
        
        if (isNaN(count) || count <= 0) {
            alert('Please enter a valid positive number.');
            continue;
        }
        
        if (count > totalWords) {
            alert(`You can't test more than ${totalWords} words. Using all available words.`);
            count = totalWords;
        }
        
        break;
    } while (true);
    
    selectedWordCount = count;
    initializeWordTest();
}

// Initialize the word test with selected number of words
function initializeWordTest() {
    // Shuffle and select the specified number of words
    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
    wordsToTest = shuffledWords.slice(0, selectedWordCount);
    
    remainingCountElement.textContent = wordsToTest.length;
    loadNewWord();
}

// Update incorrect words list
function updateIncorrectWordsList() {
    incorrectWordsList.innerHTML = '';
    incorrectWords.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `${item.correct} <span class="user-spelling">(${item.userSpelling})</span>`;
        incorrectWordsList.appendChild(li);
    });
}

// Toggle incorrect words list visibility
function toggleIncorrectWords() {
    incorrectWordsList.classList.toggle('hidden');
    toggleIncorrectBtn.textContent = incorrectWordsList.classList.contains('hidden') 
        ? 'Show Incorrect Words' 
        : 'Hide Incorrect Words';
}

// Load a new word
function loadNewWord() {
    if (wordsToTest.length === 0) {
        currentWordElement.textContent = 'No more words!';
        userInput.disabled = true;
        checkBtn.disabled = true;
        
        // Show final results
        const accuracy = totalAsked > 0 ? ((correctCount / totalAsked) * 100).toFixed(1) : 0;
        resultElement.innerHTML = `
            <strong>Test Complete!</strong><br>
            Tested ${selectedWordCount} words<br>
            Accuracy: ${accuracy}%
        `;
        resultElement.className = 'correct';
        return;
    }

    const randomIndex = Math.floor(Math.random() * wordsToTest.length);
    currentWord = wordsToTest[randomIndex].trim();
    wordsToTest.splice(randomIndex, 1);
    
    currentWordElement.textContent = '?';
    userInput.value = '';
    userInput.disabled = false;
    checkBtn.disabled = false;
    nextBtn.disabled = true;
    resultElement.textContent = '';
    isChecked = false;
    
    // Update remaining count
    remainingCountElement.textContent = wordsToTest.length;
    
    // Automatically focus on the input field
    userInput.focus();
}

// Speak the current word
function speakWord() {
    if (currentWord) {
        const utterance = new SpeechSynthesisUtterance(currentWord);
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
    }
}

// Fetch word meaning from cache or API
async function fetchWordMeaning(word) {
    const wordKey = word.toLowerCase();
    
    // Check cache first
    if (dictionaryCache[wordKey]) {
        console.log(`Found definition for "${word}" in cache`);
        return dictionaryCache[wordKey];
    }
    
    // Check if API calls are disabled
    if (!apiToggle.checked) {
        console.log(`API calls disabled - no definition found for "${word}"`);
        return null;
    }
    
    console.log(`Fetching definition for "${word}" from API`);
    
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        
        if (!response.ok) {
            // Cache the null result to avoid repeated API calls for invalid words
            dictionaryCache[wordKey] = null;
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
                dictionaryCache[wordKey] = meaningData;
                console.log(`Cached definition for "${word}"`);
                
                return meaningData;
            }
        }
        
        // Cache null result if no valid data found
        dictionaryCache[wordKey] = null;
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

// Check the user's answer
async function checkAnswer() {
    if (isChecked) return;

    const userAnswer = userInput.value.trim().toLowerCase();
    const correctAnswer = currentWord.toLowerCase();

    totalAsked++;
    totalElement.textContent = totalAsked;
    totalIncorrectElement.textContent = totalAsked;

    let resultText = '';
    let resultClass = '';

    if (userAnswer === correctAnswer) {
        correctCount++;
        correctCountElement.textContent = correctCount;
        resultText = 'Correct!';
        resultClass = 'correct';
    } else {
        incorrectCount++;
        incorrectCountElement.textContent = incorrectCount;
        incorrectWords.push({
            correct: currentWord,
            userSpelling: userInput.value.trim()
        });
        updateIncorrectWordsList();
        resultText = `Incorrect! The correct spelling is: ${currentWord}`;
        resultClass = 'incorrect';
    }

    // Fetch and display word meaning
    resultElement.innerHTML = `<div class="${resultClass}">${resultText}</div><div class="loading-meaning">Loading definition...</div>`;
    
    const meaningData = await fetchWordMeaning(currentWord);
    const meaningHtml = displayWordMeaning(meaningData);
    
    resultElement.innerHTML = `<div class="${resultClass}">${resultText}</div>${meaningHtml}`;

    isChecked = true;
    userInput.disabled = true;
    checkBtn.disabled = true;
    nextBtn.disabled = false;
}

// Export dictionary function for button
function exportDictionary() {
    const cacheCount = Object.keys(dictionaryCache).length;
    if (cacheCount === 0) {
        alert('No definitions cached yet. Test some words first!');
        return;
    }
    
    saveDictionaryCache();
    alert(`Dictionary exported with ${cacheCount} definitions!\nReplace your dictionary.json file with the downloaded file.`);
}

// Event listeners
speakBtn.addEventListener('click', speakWord);
checkBtn.addEventListener('click', checkAnswer);
nextBtn.addEventListener('click', loadNewWord);
toggleIncorrectBtn.addEventListener('click', toggleIncorrectWords);
exportBtn.addEventListener('click', exportDictionary);

// API toggle event listener
apiToggle.addEventListener('change', function() {
    const status = this.checked ? 'enabled' : 'disabled';
    console.log(`Dictionary API calls ${status}`);
});

// Add Enter key listener to input field
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission
        if (!isChecked && !userInput.disabled) {
            checkAnswer();
        } else if (isChecked && !nextBtn.disabled) {
            loadNewWord();
        }
    }
});

// Add keydown listener to handle Enter key after check and Space key for speaking
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && isChecked && !nextBtn.disabled) {
        event.preventDefault();
        loadNewWord();
    } else if (event.key === ' ' && !event.target.matches('button')) {
        event.preventDefault(); // Prevent space in input and page scroll
        speakWord();
    }
});

// Load words when the page loads
loadWords(); 