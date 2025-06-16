# 🎯 Multiplayer Spelling Game

A real-time 1v1 spelling competition game where players compete to spell words correctly and see who wins!

## 🚀 Features

- **🏠 Room System**: Create or join rooms with unique IDs
- **⚡ Real-time Competition**: Live score updates and progress tracking
- **🎮 Multiple Modes**: Choose word count (10, 25, 50, 100 words)
- **🎉 Winner Animations**: Confetti for winners, animations for results
- **📊 Detailed Results**: See both players' scores and mistakes
- **🔊 Audio Support**: Text-to-speech for word pronunciation
- **📱 Responsive Design**: Works on desktop and mobile

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Ensure you have your word list**
   - Make sure `words.txt` exists in the project root
   - Each word should be on a separate line

3. **Start the Server**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Open the Game**
   - Open your browser and go to `http://localhost:3000/multiplayer.html`
   - Share this URL with your friend to play together!

## 🎮 How to Play

### Creating a Room
1. Enter your name
2. Click "Create Room"
3. Choose number of words (10-100)
4. Share the Room ID with your opponent
5. Click "Ready" when both players have joined
6. Game starts automatically when both players are ready!

### Joining a Room
1. Enter your name
2. Click "Join Room"
3. Enter the Room ID shared by your friend
4. Click "Ready" when you're prepared to play

### During the Game
- **Listen**: Click 🔊 to hear the word pronunciation
- **Type**: Enter your spelling in the text field
- **Submit**: Press Enter or click "Check"
- **Progress**: Watch real-time score updates for both players
- **Next**: Move to the next word after checking

### Winning
- Player with the most correct spellings wins!
- Enjoy confetti animation if you win! 🎉
- See detailed results including all mistakes

## 📁 File Structure

```
multiplayer-spelling-game/
├── server.js              # Node.js server with Socket.IO
├── multiplayer.html       # Main multiplayer interface
├── multiplayer-script.js  # Frontend JavaScript logic
├── multiplayer-styles.css # Styling and animations
├── package.json          # Dependencies and scripts
├── words.txt             # Word list for the game
└── README.md             # This file
```

## 🔧 Technical Details

### Backend (server.js)
- **Express.js**: Web server
- **Socket.IO**: Real-time communication
- **Room Management**: Create/join rooms with unique IDs
- **Game State**: Track scores, progress, and game status
- **Word Selection**: Random word selection from your word list

### Frontend
- **Real-time Updates**: Live score tracking
- **Screen Management**: Multiple game screens (menu, lobby, game, results)
- **Animations**: Winner/loser animations with CSS
- **Responsive Design**: Mobile-friendly interface

## 🎨 Customization

### Adding More Words
- Edit `words.txt` file
- Add one word per line
- Restart the server

### Changing Game Settings
- Modify word count options in `multiplayer.html`
- Adjust animations in `multiplayer-styles.css`
- Customize server settings in `server.js`

## 🐛 Troubleshooting

### Common Issues

**Server won't start:**
- Check if port 3000 is available
- Run `npm install` to ensure dependencies are installed

**Players can't connect:**
- Make sure both players use the same server URL
- Check if firewall is blocking the connection

**Words not loading:**
- Ensure `words.txt` exists in the project root
- Check file permissions

## 🚀 Deployment

For production deployment:

1. **Set Environment Variables**
   ```bash
   export PORT=3000
   ```

2. **Start in Production Mode**
   ```bash
   npm start
   ```

3. **Use a Process Manager** (recommended)
   ```bash
   npm install -g pm2
   pm2 start server.js --name "spelling-game"
   ```

## 🎯 Game Flow

```
Player 1 Creates Room → Gets Room ID
Player 2 Joins Room → Enters Room ID
Both Players Ready → Game Starts
Same Words, Same Order → Real-time Competition
Both Finish → Results Screen → Winner/Loser Animations
```

## 🏆 Features in Detail

- **Fair Play**: Both players get the same words in the same order
- **Progress Tracking**: Visual progress bars show completion status
- **Mistake Recording**: All incorrect spellings are tracked and displayed
- **Accuracy Calculation**: Final accuracy percentage for both players
- **Graceful Disconnection**: Handle player leaving mid-game

Enjoy your multiplayer spelling competition! 🎉
