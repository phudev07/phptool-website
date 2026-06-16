import os
from PIL import Image

logo_path = './public/logo.png'

if not os.path.exists(logo_path):
    print("Logo not found at path:", logo_path)
    exit(1)

try:
    img = Image.open(logo_path)
    img = img.convert('RGBA')
    pixels = list(img.getdata())
    
    # Filter out transparent pixels and background black/white pixels
    colors = {}
    for p in pixels:
        r, g, b, a = p
        if a < 50: # skip transparent
            continue
        # Skip grayscale/black/white
        if abs(r - g) < 10 and abs(g - b) < 10:
            continue
            
        color_hex = f"#{r:02x}{g:02x}{b:02x}"
        colors[color_hex] = colors.get(color_hex, 0) + 1
        
    sorted_colors = sorted(colors.items(), key=lambda x: x[1], reverse=True)
    print("Top 10 dominant colored hex codes in logo:")
    for color, count in sorted_colors[:10]:
        print(f"{color}: {count} pixels")
except Exception as e:
    print("Error reading image:", e)
