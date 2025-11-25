import re
import json
import os
from pathlib import Path
from links import player_links

# Get all image files
image_dir = Path(__file__).parent / "Image"
image_files = list(image_dir.glob("*_transparent.png")) if image_dir.exists() else []

# Create mapping: player_name -> image_filename
player_image_map = {}

for player_name, url in player_links.items():
    # Extract player ID from URL (e.g., "abdifa01w" from the URL)
    match = re.search(r'/([^/]+)\.html$', url)
    if match:
        player_id = match.group(1)
        # Check if image exists
        image_filename = f"{player_id}_transparent.png"
        image_path = image_dir / image_filename
        if image_path.exists():
            player_image_map[player_name] = image_filename

# Save to JSON file
output_file = Path(__file__).parent / "player_image_map.json"
with open(output_file, 'w') as f:
    json.dump(player_image_map, f, indent=2)

print(f"Generated mapping for {len(player_image_map)} players")
print(f"Saved to {output_file}")

