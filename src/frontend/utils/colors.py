# colors.py - Simple color loader script
import re
from pathlib import Path
import os

# Global variable to store colors
COLORS = {}

def load_colors(css_file_path: str):
    """Load colors from CSS file into global COLORS dict"""
    global COLORS
    
    css_path = Path(css_file_path).expanduser()
    
    if not css_path.exists():
        print(f"Warning: CSS file not found at {css_path}")
        return
    
    with open(css_path, 'r', encoding='utf-8') as file:
        css_content = file.read()
    
    # Find :root block
    root_pattern = r':root\s*\{([^}]+)\}'
    root_match = re.search(root_pattern, css_content, re.DOTALL)
    
    if root_match:
        root_content = root_match.group(1)
        # Extract CSS variables (--variable-name: value;)
        var_pattern = r'(--[\w-]+)\s*:\s*([^;]+);'
        matches = re.findall(var_pattern, root_content)
        
        for var_name, var_value in matches:
            # Remove -- prefix for easier access
            clean_name = var_name.replace('--', '')
            COLORS[clean_name] = var_value.strip()

# get current working directory and load colors
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
css_file = os.path.join(current_dir, "assets", "root", "app.css")
load_colors(css_file)


# Print loaded colors for debugging
if __name__ == "__main__":
    print("Available colors:")
    for name, value in COLORS.items():
        print(f"  {name}: {value}")