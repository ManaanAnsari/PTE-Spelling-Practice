const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('.'));

// Game rooms storage
const rooms = new Map();

// Room class to manage game state
class GameRoom {
    constructor(roomId, hostId, wordCount) {
        this.roomId = roomId;
        this.players = new Map();
        this.wordCount = wordCount;
        this.words = [];
        this.currentWordIndex = 0;
        this.gameStarted = false;
        this.gameEnded = false;
        
        // Add host player
        this.addPlayer(hostId, true);
    }
    
    addPlayer(playerId, isHost = false) {
        this.players.set(playerId, {
            id: playerId,
            isHost,
            ready: false,
            score: {
                correct: 0,
                incorrect: 0,
                total: 0
            },
            incorrectWords: [],
            currentWordIndex: 0,
            finished: false
        });
    }
    
    removePlayer(playerId) {
        this.players.delete(playerId);
    }
    
    getPlayerCount() {
        return this.players.size;
    }
    
    areAllPlayersReady() {
        return this.players.size === 2 && 
               Array.from(this.players.values()).every(player => player.ready);
    }
    
    areAllPlayersFinished() {
        return Array.from(this.players.values()).every(player => player.finished);
    }
    
    getGameResults() {
        const players = Array.from(this.players.values());
        const [player1, player2] = players;
        
        let winner = null;
        if (player1.score.correct > player2.score.correct) {
            winner = player1.id;
        } else if (player2.score.correct > player1.score.correct) {
            winner = player2.id;
        }
        
        return {
            player1: {
                id: player1.id,
                score: player1.score,
                incorrectWords: player1.incorrectWords,
                isWinner: winner === player1.id
            },
            player2: {
                id: player2.id,
                score: player2.score,
                incorrectWords: player2.incorrectWords,
                isWinner: winner === player2.id
            },
            isDraw: winner === null
        };
    }
}

// Generate random room ID
function generateRoomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Create room
    socket.on('createRoom', (data) => {
        const { playerName, wordCount } = data;
        const roomId = generateRoomId();
        
        const room = new GameRoom(roomId, socket.id, wordCount);
        rooms.set(roomId, room);
        
        socket.join(roomId);
        socket.roomId = roomId;
        socket.playerName = playerName;
        
        socket.emit('roomCreated', {
            roomId,
            playerName,
            wordCount,
            isHost: true
        });
        
        console.log(`Room ${roomId} created by ${playerName}`);
    });
    
    // Join room
    socket.on('joinRoom', (data) => {
        const { roomId, playerName } = data;
        console.log(`Join room request: roomId=${roomId}, playerName=${playerName}`);
        
        const room = rooms.get(roomId);
        
        if (!room) {
            console.log(`Room ${roomId} not found`);
            socket.emit('roomError', 'Room not found');
            return;
        }
        
        if (room.getPlayerCount() >= 2) {
            console.log(`Room ${roomId} is full`);
            socket.emit('roomError', 'Room is full');
            return;
        }
        
        if (room.gameStarted) {
            console.log(`Room ${roomId} game already started`);
            socket.emit('roomError', 'Game already started');
            return;
        }
        
        room.addPlayer(socket.id, false);
        socket.join(roomId);
        socket.roomId = roomId;
        socket.playerName = playerName;
        
        console.log(`${playerName} successfully joined room ${roomId}. Room now has ${room.getPlayerCount()} players`);
        
        // Send room info to the joining player to transition to waiting room
        socket.emit('roomJoined', {
            roomId,
            wordCount: room.wordCount,
            isHost: false
        });
        
        // Notify both players that someone joined
        io.to(roomId).emit('playerJoined', {
            playerName,
            playerCount: room.getPlayerCount(),
            wordCount: room.wordCount
        });
    });
    
    // Player ready
    socket.on('playerReady', () => {
        const room = rooms.get(socket.roomId);
        if (!room) {
            console.log('Room not found for playerReady');
            return;
        }
        
        const player = room.players.get(socket.id);
        if (player) {
            player.ready = true;
            console.log(`Player ${socket.playerName} is ready in room ${socket.roomId}`);
            
            io.to(socket.roomId).emit('playerReadyUpdate', {
                playerId: socket.id,
                playerName: socket.playerName,
                ready: true
            });
            
            // Start game if both players are ready
            if (room.areAllPlayersReady()) {
                console.log(`Both players ready in room ${socket.roomId}, starting game...`);
                startGame(room);
            } else {
                console.log(`Waiting for other player in room ${socket.roomId}`);
            }
        }
    });
    
    // Submit answer
    socket.on('submitAnswer', (data) => {
        const { userAnswer, currentWord, isCorrect } = data;
        const room = rooms.get(socket.roomId);
        if (!room || !room.gameStarted) return;
        
        const player = room.players.get(socket.id);
        if (!player) return;
        
        // Update player score
        if (isCorrect) {
            player.score.correct++;
        } else {
            player.score.incorrect++;
            player.incorrectWords.push({
                correct: currentWord,
                userSpelling: userAnswer
            });
        }
        player.score.total++;
        player.currentWordIndex++;
        
        // Check if player finished
        if (player.currentWordIndex >= room.words.length) {
            player.finished = true;
        }
        
        // Broadcast score update
        io.to(socket.roomId).emit('scoreUpdate', {
            playerId: socket.id,
            playerName: socket.playerName,
            score: player.score,
            finished: player.finished
        });
        
        // Check if game is complete
        if (room.areAllPlayersFinished()) {
            endGame(room);
        }
    });
    
    // Disconnect handling
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        if (socket.roomId) {
            const room = rooms.get(socket.roomId);
            if (room) {
                room.removePlayer(socket.id);
                
                if (room.getPlayerCount() === 0) {
                    rooms.delete(socket.roomId);
                    console.log(`Room ${socket.roomId} deleted`);
                } else {
                    io.to(socket.roomId).emit('playerLeft', {
                        playerName: socket.playerName
                    });
                }
            }
        }
    });
});

// Start game function
async function startGame(room) {
    try {
        // Load words (you'll need to have words.txt accessible)
        const fs = require('fs');
        const wordsText = fs.readFileSync('words.txt', 'utf8');
        const allWords = wordsText.split('\n')
            .map(word => word.trim())
            .filter(word => word.length > 0);
        
        // Shuffle and select words
        const shuffledWords = allWords.sort(() => Math.random() - 0.5);
        room.words = shuffledWords.slice(0, room.wordCount);
        room.gameStarted = true;
        
        // Send game start signal with words
        io.to(room.roomId).emit('gameStarted', {
            words: room.words,
            totalWords: room.words.length
        });
        
        console.log(`Game started in room ${room.roomId} with ${room.words.length} words`);
    } catch (error) {
        console.error('Error starting game:', error);
        io.to(room.roomId).emit('gameError', 'Failed to start game');
    }
}

// End game function
function endGame(room) {
    room.gameEnded = true;
    const results = room.getGameResults();
    
    io.to(room.roomId).emit('gameEnded', results);
    console.log(`Game ended in room ${room.roomId}`);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Multiplayer Spelling Game server running on port ${PORT}`);
}); 