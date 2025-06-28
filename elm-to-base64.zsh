#!/bin/zsh

# Create the base64 directory if it doesn't exist
mkdir -p content-generation/base64

# Process all .json files in the elm directory
for json_file in content-generation/elm/*.json; do
    # Check if any .json files exist
    if [[ ! -e "$json_file" ]]; then
        echo "No .json files found in content-generation/elm/"
        exit 1
    fi
    
    # Extract filename without path and extension
    filename=$(basename "$json_file" .json)
    
    # Generate base64 encoded file
    base64 -i "$json_file" -o "content-generation/base64/${filename}.txt"
    
    echo "Converted: $json_file -> content-generation/base64/${filename}.txt"
done

echo "Base64 encoding complete!"