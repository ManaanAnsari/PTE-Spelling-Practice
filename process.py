import json
import requests
import time
from typing import Dict, Any, Optional

# Configuration
API_DELAY = 0.3  # Seconds between API calls (adjust for speed vs. API respect)
SAVE_INTERVAL = 10  # Save progress every N words
TIMEOUT = 10  # API timeout in seconds

def estimate_processing_time(word_count: int, existing_count: int) -> None:
    """Estimate processing time for remaining words"""
    words_to_process = word_count - existing_count
    if words_to_process <= 0:
        print("✅ All words already have definitions!")
        return
    
    estimated_seconds = words_to_process * (API_DELAY + 0.5)  # API delay + avg request time
    estimated_minutes = estimated_seconds / 60
    
    print(f"📊 Processing estimate:")
    print(f"   Words to process: {words_to_process}")
    print(f"   Estimated time: {estimated_minutes:.1f} minutes")
    print(f"   API delay: {API_DELAY}s per word")

def load_dictionary() -> Dict[str, Any]:
    """Load existing dictionary from dictionary.json"""
    try:
        with open('dictionary.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("dictionary.json not found, starting with empty dictionary")
        return {}
    except json.JSONDecodeError:
        print("Invalid JSON in dictionary.json, starting with empty dictionary")
        return {}

def save_dictionary(dictionary: Dict[str, Any]) -> None:
    """Save dictionary to dictionary.json"""
    try:
        with open('dictionary.json', 'w', encoding='utf-8') as f:
            json.dump(dictionary, f, indent=2, ensure_ascii=False)
        print(f"Dictionary saved with {len(dictionary)} definitions")
    except Exception as e:
        print(f"Error saving dictionary: {e}")

def fetch_word_definition(word: str) -> Optional[Dict[str, str]]:
    """Fetch word definition from Dictionary API"""
    try:
        url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
        response = requests.get(url, timeout=TIMEOUT)
        
        if response.status_code != 200:
            print(f"  ❌ No definition found for '{word}'")
            return None
            
        data = response.json()
        
        if data and len(data) > 0:
            word_data = data[0]
            
            if word_data.get('meanings') and len(word_data['meanings']) > 0:
                meaning = word_data['meanings'][0]
                definition = None
                example = ""
                
                if meaning.get('definitions') and len(meaning['definitions']) > 0:
                    definition = meaning['definitions'][0].get('definition', '')
                    example = meaning['definitions'][0].get('example', '')
                
                if definition:
                    result = {
                        'partOfSpeech': meaning.get('partOfSpeech', ''),
                        'definition': definition,
                        'phonetic': word_data.get('phonetic', ''),
                        'example': example
                    }
                    print(f"  ✅ Fetched definition for '{word}'")
                    return result
        
        print(f"  ❌ No valid definition found for '{word}'")
        return None
        
    except requests.RequestException as e:
        print(f"  ❌ API error for '{word}': {e}")
        return None
    except Exception as e:
        print(f"  ❌ Error processing '{word}': {e}")
        return None

def process_words():
    """
    Read words from words.txt, convert to lowercase, trim whitespace,
    fetch definitions, and update dictionary.json
    """
    try:
        # Load existing dictionary
        print("Loading existing dictionary...")
        dictionary = load_dictionary()
        initial_count = len(dictionary)
        
        # Read words from input file
        print("Reading words from words.txt...")
        with open('words.txt', 'r', encoding='utf-8') as input_file:
            words = input_file.readlines()
        
        # Process words: lowercase, strip whitespace, and remove duplicates
        processed_words = []
        seen_words = set()
        for word in words:
            cleaned_word = word.strip().lower()
            if cleaned_word and cleaned_word not in seen_words:
                processed_words.append(cleaned_word)
                seen_words.add(cleaned_word)
        
        print(f"Found {len(processed_words)} unique words to process")
        
        # Show time estimate
        words_already_cached = sum(1 for word in processed_words if word in dictionary)
        estimate_processing_time(len(processed_words), words_already_cached)
        
        # Ask user confirmation for large batches
        if len(processed_words) - words_already_cached > 100:
            response = input("\nProceed with processing? (y/n): ").lower().strip()
            if response != 'y':
                print("Processing cancelled.")
                return
        
        # Process each word and update dictionary
        start_time = time.time()
        new_definitions = 0
        
        for i, word in enumerate(processed_words, 1):
            print(f"Processing word {i}/{len(processed_words)}: '{word}'")
            
            # Check if word already exists in dictionary
            if word in dictionary:
                print(f"  ℹ️  Already have definition for '{word}'")
                continue
            
            # Fetch definition from API
            definition_data = fetch_word_definition(word)
            
            if definition_data:
                dictionary[word] = definition_data
                new_definitions += 1
                
                # Save dictionary every N words to avoid losing progress
                if new_definitions % SAVE_INTERVAL == 0:
                    save_dictionary(dictionary)
                    elapsed = time.time() - start_time
                    rate = new_definitions / elapsed * 60  # words per minute
                    print(f"  💾 Saved progress ({new_definitions} new definitions, {rate:.1f} words/min)")
            
            # Be respectful to the API
            time.sleep(API_DELAY)
        
        # Final save
        save_dictionary(dictionary)
        
        # Write processed words to output file
        with open('processed.txt', 'w', encoding='utf-8') as output_file:
            for word in processed_words:
                output_file.write(word + '\n')
        
        # Final statistics
        total_time = time.time() - start_time
        print(f"\n🎉 Processing complete in {total_time/60:.1f} minutes!")
        print(f"📝 Processed {len(processed_words)} words → saved to processed.txt")
        print(f"📚 Dictionary: {initial_count} → {len(dictionary)} definitions ({new_definitions} new)")
        if new_definitions > 0:
            rate = new_definitions / total_time * 60
            print(f"⚡ Processing rate: {rate:.1f} words per minute")
        
    except FileNotFoundError:
        print("❌ Error: words.txt file not found")
    except Exception as e:
        print(f"❌ Error processing file: {e}")

if __name__ == "__main__":
    process_words() 