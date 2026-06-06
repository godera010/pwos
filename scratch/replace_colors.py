import os
import re

# File extensions to scan
EXTENSIONS = {'.tsx', '.ts', '.js', '.css', '.json'}

# Target directories and files
PATHS = [
    r'c:\Users\Godwin\Documents\projects\pwos\src\mobile\app',
    r'c:\Users\Godwin\Documents\projects\pwos\src\mobile\src',
    r'c:\Users\Godwin\Documents\projects\pwos\src\mobile\tailwind.config.js',
    r'c:\Users\Godwin\Documents\projects\pwos\src\mobile\app.json',
]

# Replacements (case-insensitive search)
REPLACEMENTS = [
    ('#090d16', '#000000'),  # Background
    ('#0c1220', '#09090b'),  # Card Background / Zinc-950
    ('#131b2e', '#1f1f23'),  # Borders / Zinc-900
    ('#1d273a', '#27272a'),  # Zinc-800
    ('#182235', '#1f1f23'),  # Zinc-900 border
    ('#070b13', '#09090b'),  # Zinc-950 background
    ('#04060b', '#09090b'),  # Zinc-950 terminal background
    ('#0b0f19', '#000000'),  # Config background
    ('#161b2a', '#09090b'),  # Config card
    ('#1f2937', '#27272a'),  # Config border
]

def replace_in_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        orig_content = content
        for old, new in REPLACEMENTS:
            # Case-insensitive replacement
            pattern = re.compile(re.escape(old), re.IGNORECASE)
            content = pattern.sub(new, content)
            
        if content != orig_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated: {file_path}")
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def main():
    for path in PATHS:
        if os.path.isfile(path):
            replace_in_file(path)
        elif os.path.isdir(path):
            for root, dirs, files in os.walk(path):
                for file in files:
                    ext = os.path.splitext(file)[1]
                    if ext.lower() in EXTENSIONS:
                        full_path = os.path.join(root, file)
                        replace_in_file(full_path)

if __name__ == '__main__':
    main()
