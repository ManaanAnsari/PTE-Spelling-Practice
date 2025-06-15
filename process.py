def process_words():
    """
    Read words from words.txt, convert to lowercase, trim whitespace,
    and save to processed.txt
    """
    try:
        # Read words from input file
        with open('words.txt', 'r', encoding='utf-8') as input_file:
            words = input_file.readlines()
        
        # Process words: lowercase, strip whitespace, and remove duplicates
        processed_words = []
        seen_words = set()
        for word in words:
            # Convert to lowercase and remove leading/trailing whitespace
            cleaned_word = word.strip().lower()
            # Only add non-empty words that haven't been seen before
            if cleaned_word and cleaned_word not in seen_words:
                processed_words.append(cleaned_word)
                seen_words.add(cleaned_word)
        
        # Write processed words to output file
        with open('processed.txt', 'w', encoding='utf-8') as output_file:
            for word in processed_words:
                output_file.write(word + '\n')
        
        print(f"Successfully processed {len(processed_words)} words")
        print("Results saved to processed.txt")
        
    except FileNotFoundError:
        print("Error: words.txt file not found")
    except Exception as e:
        print(f"Error processing file: {e}")

if __name__ == "__main__":
    process_words() 