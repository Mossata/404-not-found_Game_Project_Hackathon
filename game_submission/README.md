# 🔥 Bushfire Balance - Tower Defense Game

## Overview
**Bushfire Balance** is a browser-based tower defense game that educates players about the critical decisions faced during Australian bushfires. The game demonstrates why "Leave Early or Be Prepared" is the golden rule of bushfire survival.

## Game Theme & Educational Purpose
This game addresses the pressing social issue of **bushfire safety and awareness in Australia**. It highlights:
- The impossible choice between defending property vs. guaranteeing survival
- How quickly fire can cut off escape routes
- The financial and human cost of staying too long
- The deadly gamble of attempting to defend your home

## How to Play

### Objective
Your house is on the left, and fire advances from the right. You must decide:
- **Stay and defend** using defenses (risky, potential for complete loss)
- **Leave early** (guaranteed survival, but property is lost)

### Controls
1. **Earn Money**: You passively earn $10/second from your job
2. **Buy Defenses**: Click defense buttons on the right sidebar
3. **Place Defenses**: Click any tile on the grid to place selected defense
4. **Leave**: Click the green "LEAVE NOW" button at the bottom

### Defenses
- **💧 Water Hose ($50)**: Slows fire in the lane ahead. Health: 3
- **🧱 Fire Block ($100)**: Blocks fire temporarily. Health: 5  
- **🌧️ Sprinkler ($200)**: Slows fire in a 2x2 area. Health: 2

### Game Mechanics
- **Fire spawns** from the right and advances left toward your house
- **Fire spreads** sideways to adjacent lanes over time
- **Fire grows stronger** with each wave
- **Income stops** when fire gets too close (column 6)
- **Escape is blocked** when fire reaches the driveway (middle row)
- **Defenses slow but cannot stop** the fire permanently

### Win/Lose Conditions
There is no "win" - the fire always eventually overwhelms defenses (mimicking reality).

**Outcomes:**
1. **Leave Early** ✅: Guaranteed survival, house lost, financial loss but alive
2. **Stay & Survive** 🏆: Roll 4+ on dice, survive but massive property damage
3. **Stay & Perish** 💀: Roll 1-3 on dice, tragic death

## Running the Game

### Method 1: Direct Opening (Easiest)
Simply run in a VSCode Powershell terminal:
start <insert full path to indext.html file>

### Method 2: Local Server (Optional)
```bash
# Using Python 3
cd game_app
python -m http.server 8000
# Open browser to http://localhost:8000
```

### Method 3: VS Code Live Server
1. Install "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"

## Technology Stack
- **HTML5**: Structure and Canvas element
- **CSS3**: Styling, animations, responsive design
- **JavaScript**: Game logic, grid system, fire AI, rendering
- **Canvas API**: 2D rendering for the game grid

No external libraries or frameworks required - runs entirely in the browser!

## Project Structure
```
game_app/
├── index.html       # Main HTML structure (all screens)
├── style.css        # Complete styling and animations
└── script.js        # Game logic and Canvas rendering
```

## Educational Impact

### Real-World Lessons
The game teaches players:
1. **Fire is unstoppable** - No amount of preparation can guarantee you'll save your home
2. **Leaving early saves lives** - The "Leave and Live" message from fire services
3. **Escape windows close fast** - Roads get blocked, decisions become impossible
4. **The financial reality** - Losing a house is devastating but not worth your life
5. **The deadly gamble** - Over 70% of bushfire deaths are people defending homes

### Post-Game Reflection
Each ending provides a detailed lesson explaining:
- What happened in the game
- What this means in reality
- Official fire service recommendations
- Statistics about bushfire deaths

## Game Balance & Design Choices

### Why the fire can't be stopped:
In real bushfires, even professional firefighters often cannot save every structure. The game reflects this harsh reality - defenses only delay, never defeat.

### Why leaving is "boring" but safe:
This is intentional. The game rewards staying with higher scores IF you survive, creating the same temptation people face in real fires. But the lesson is clear: the safe choice is always best.

### Why the dice roll is random:
Surviving a bushfire by staying in your house is mostly luck. The game doesn't hide this - it's a literal dice roll, emphasizing the gamble.

## Future Expansion Ideas
- More defense types (firebreaks, backup generators)
- Different difficulty levels (ember attack, wind changes)
- Multiple map layouts (urban, rural, coastal)
- Firefighter support mechanics
- Emergency alert system simulation
- Multiple endings based on preparation level

## Credits
- **Concept**: Inspired by Plants vs Zombies tower defense mechanics
- **Theme**: Australian bushfire safety and "Leave and Live" campaigns
- **Purpose**: RMIT Hackathon 2025 - Social Impact Gaming Challenge

## License
Educational project for RMIT Hackathon 2025

---

## Acknowledgments
This game is dedicated to the victims of Australian bushfires and the brave firefighters who risk their lives to protect communities.

**Remember**: In a real bushfire, leave early. Your life is irreplaceable.

🌏 **Stay safe. Stay informed. Leave early.**
