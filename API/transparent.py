from PIL import Image
import requests
from io import BytesIO
from links import player_links
import re
from pathlib import Path
# Download the image
for player, link in player_links.items():
    matched = re.search(r'/([^/]+)\.html', link)


    if matched:
        extracted = matched.group(1)
        print(f"Extracted: {extracted}")
        
        # Save to file
        with open('extracted_text.txt', 'w') as f:
           match = extracted
        print(f"Saved '{extracted}' to 'extracted_text.txt'")
    else:
        print("No match found")
        continue
    if Path('API/Image/' + match + '_transparent.png').exists():
        print(f"Image already exists: {match}")
        continue
    url = "https://www.basketball-reference.com/req/202106291/images/headshots/" + match + ".jpg"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
    except requests.exceptions.RequestException as e:
        print(f"✗ Request failed for {match}: {e}")
        print(f"  URL: {url}")
        continue
    
    # Check if request was successful
    if response.status_code != 200:
        print(f"✗ Failed to download image for {match}: HTTP {response.status_code}")
        print(f"  URL: {url}")
        continue
    
    # Check if response is actually an image
    content_type = response.headers.get('content-type', '')
    if not content_type.startswith('image/'):
        print(f"✗ URL did not return an image for {match}: {content_type}")
        print(f"  URL: {url}")
        # Try to show preview if it's text
        try:
            preview = response.content[:200].decode('utf-8', errors='ignore')
            print(f"  Response preview: {preview}")
        except:
            print(f"  Response is binary (not text)")
        continue
    
    # Check if content is not empty
    if not response.content:
        print(f"✗ Empty response for {match}")
        print(f"  URL: {url}")
        continue
    
    try:
        img = Image.open(BytesIO(response.content)).convert('RGBA')
    except Exception as e:
        print(f"✗ Failed to open image for {match}: {e}")
        print(f"  URL: {url}")
        print(f"  Content length: {len(response.content)} bytes")
        continue
    pixels = img.getdata()
    new_pixels = []
    threshold = 240  # Adjust this value if needed (lower = more aggressive)

    for pixel in pixels:
        # If pixel is white or close to white, make it transparent
        if pixel[0] > threshold and pixel[1] > threshold and pixel[2] > threshold:
            new_pixels.append((255, 255, 255, 0))  # Transparent
        else:
            new_pixels.append(pixel)

    # Update image
    img.putdata(new_pixels)

    # Save the result
    output_filename = match + '_transparent.png'
    print(f"✓ Image saved as '{output_filename}'")

    # Optional: Show statistics
    total_pixels = len(new_pixels)
    transparent_pixels = sum(1 for p in new_pixels if p[3] == 0)
    print(f"Total pixels: {total_pixels}")
    print(f"Transparent pixels: {transparent_pixels}")
    print(f"Percentage made transparent: {(transparent_pixels/total_pixels)*100:.2f}%")
    # Optional: Save to a specific folder
    import os
    os.makedirs('API/Image', exist_ok=True)
    img.save('API/Image/' + match + '_transparent.png')