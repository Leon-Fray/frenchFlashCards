let wordBank = [];
let shuffledIndices = [];
let currentIndex = 0;
let currentAudio = null;

// Function to shuffle an array using Fisher-Yates algorithm
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Function to create shuffled indices for random card order
function createShuffledIndices() {
    const indices = Array.from({ length: wordBank.length }, (_, i) => i);
    shuffledIndices = shuffleArray(indices);
    currentIndex = 0;
}

// Function to load word bank from JSON file
async function loadWordBank() {
    try {
        const response = await fetch('word_bank.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Convert the JSON object to array format expected by the flashcard
        wordBank = Object.entries(data).map(([french, english]) => ({
            french: french,
            english: english
        }));
        
        // Create shuffled order and show first card
        createShuffledIndices();
        document.getElementById('next-btn').disabled = false;
        document.getElementById('speak-btn').disabled = false;
        showCurrentCard();
        
    } catch (error) {
        console.error('Error loading word bank:', error);
        
        // Fallback: Load a few sample words if JSON fails
        wordBank = [
            { french: "Salut", english: "Hi/Hello" },
            { french: "Oui", english: "Yes" },
            { french: "Merci beaucoup", english: "Thank you very much" },
            { french: "Je comprends", english: "I understand" },
            { french: "C'est important", english: "It's important" }
        ];
        
        // Create shuffled order and show first card
        createShuffledIndices();
        document.getElementById('next-btn').disabled = false;
        document.getElementById('speak-btn').disabled = false;
        showCurrentCard();
        
        // Show error message in console
        console.warn('Using fallback data. To fix: serve files through HTTP server (not file://)');
    }
}

function showCurrentCard() {
    if (wordBank.length === 0 || shuffledIndices.length === 0) return;
    
    const randomIndex = shuffledIndices[currentIndex];
    const card = document.getElementById("card");
    card.classList.remove("flipped");
    document.getElementById("front-text").textContent = wordBank[randomIndex].french;
    document.getElementById("back-text").textContent = wordBank[randomIndex].english;
}

// Export functions used in HTML
window.flipCard = function flipCard() {
    if (wordBank.length === 0) return;
    
    const card = document.getElementById("card");
    card.classList.toggle("flipped");
}

window.nextCard = function nextCard() {
    if (wordBank.length === 0) return;
    
    // Move to next card in shuffled order
    currentIndex = (currentIndex + 1) % shuffledIndices.length;
    
    // If we've gone through all cards, reshuffle for variety
    if (currentIndex === 0) {
        createShuffledIndices();
    }
    
    showCurrentCard();
}

// Function to speak the current French word using ElevenLabs
window.speakFrench = async function speakFrench() {
    if (wordBank.length === 0 || shuffledIndices.length === 0) return;
    
    // Debug logging
    console.log('API Key length:', window.CONFIG.ELEVENLABS_API_KEY.length);
    console.log('API Key starts with:', window.CONFIG.ELEVENLABS_API_KEY.substring(0, 4) + '...');
    
    // Stop any currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    const randomIndex = shuffledIndices[currentIndex];
    const frenchText = wordBank[randomIndex].french;
    
    // Show loading state
    const speakBtn = document.getElementById('speak-btn');
    const originalText = speakBtn.textContent;
    speakBtn.textContent = '⏳ Loading...';
    speakBtn.disabled = true;
    
    try {
        // Make request to ElevenLabs API
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${window.CONFIG.ELEVENLABS_VOICE_ID}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': window.CONFIG.ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
                text: frenchText,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.8,
                    style: 0.0,
                    use_speaker_boost: true
                }
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status}\nResponse: ${errorText}`);
        }
        
        // Convert response to audio blob
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Create and play audio
        currentAudio = new Audio(audioUrl);
        currentAudio.play();
        
        // Clean up URL when audio ends
        currentAudio.addEventListener('ended', () => {
            URL.revokeObjectURL(audioUrl);
        });
        
        console.log(`Playing French audio for: "${frenchText}"`);
        
    } catch (error) {
        console.error('Error with ElevenLabs TTS:', error);
        alert('Error playing audio. Please check your API key and internet connection.');
    } finally {
        // Restore button state
        speakBtn.textContent = originalText;
        speakBtn.disabled = false;
    }
}

// Load word bank when page loads
loadWordBank();
