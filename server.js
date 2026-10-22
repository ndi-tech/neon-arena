const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public')); 

const rooms = {};
const GRID_SIZE = 30;
const MAX_TRAIL_LENGTH = 10; // Tension setting: Trails can't get longer than 10 blocks

io.on('connection', (socket) => {
    socket.on('createRoom', () => {
        const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        rooms[roomCode] = {
            players: [
                // Start with 3 blocks
                { id: socket.id, x: 5, y: 15, dir: 'RIGHT', trail: [{x:5,y:15},{x:4,y:15},{x:3,y:15}], color: '#00ffcc', alive: true, score: 0 },
                { id: 'solo_p2', x: 24, y: 15, dir: 'LEFT', trail: [{x:24,y:15},{x:25,y:15},{x:26,y:15}], color: '#ff00ff', alive: true, score: 0 }
            ],
            powerup: null,
            state: 'waiting',
            speed: 150 
        };
        socket.join(roomCode);
        socket.emit('roomCreated', roomCode);
    });

    socket.on('startSolo', (roomCode) => {
        const room = rooms[roomCode];
        if (room) {
            room.state = 'countdown';
            io.to(roomCode).emit('gameStart', room);
            setTimeout(() => {
                if (rooms[roomCode]) {
                    rooms[roomCode].state = 'playing';
                    io.to(roomCode).emit('stateUpdate', rooms[roomCode]);
                    startGameLoop(roomCode);
                }
            }, 3500); 
        }
    });

    socket.on('joinRoom', (roomCode) => {
        const room = rooms[roomCode];
        if (room && room.players.length === 1) {
            room.players.push({ id: socket.id, x: 24, y: 15, dir: 'LEFT', trail: [{x:24,y:15},{x:25,y:15},{x:26,y:15}], color: '#ff00ff', alive: true, score: 0 });
            room.state = 'countdown';
            socket.join(roomCode);
            io.to(roomCode).emit('gameStart', room);
            setTimeout(() => {
                if (rooms[roomCode]) {
                    rooms[roomCode].state = 'playing';
                    io.to(roomCode).emit('stateUpdate', rooms[roomCode]);
                    startGameLoop(roomCode);
                }
            }, 3500); 
        } else if (room && room.players.length === 2 && room.players[1].id === 'solo_p2') {
             room.players[1].id = socket.id;
             room.state = 'countdown';
             socket.join(roomCode);
             io.to(roomCode).emit('gameStart', room);
             setTimeout(() => {
                 if (rooms[roomCode]) {
                     rooms[roomCode].state = 'playing';
                     io.to(roomCode).emit('stateUpdate', rooms[roomCode]);
                     startGameLoop(roomCode);
                 }
             }, 3500);
        } else {
            socket.emit('errorMsg', 'Room full or invalid');
        }
    });

    socket.on('restartGame', (roomCode) => {
        const room = rooms[roomCode];
        if (room) {
            room.state = 'countdown';
            room.powerup = null;
            room.speed = 150; 
            room.players.forEach((p, index) => {
                p.alive = true;
                p.score = 0;
                p.x = index === 0 ? 5 : 24;
                p.y = 15;
                p.dir = index === 0 ? 'RIGHT' : 'LEFT';
                // Restart with 3 blocks
                if (p.dir === 'RIGHT') p.trail = [{x: p.x, y: p.y}, {x: p.x-1, y: p.y}, {x: p.x-2, y: p.y}];
                else p.trail = [{x: p.x, y: p.y}, {x: p.x+1, y: p.y}, {x: p.x+2, y: p.y}];
            });
            io.to(roomCode).emit('gameStart', room);
            io.to(roomCode).emit('stateUpdate', room);
            setTimeout(() => {
                if (rooms[roomCode]) {
                    rooms[roomCode].state = 'playing';
                    io.to(roomCode).emit('stateUpdate', rooms[roomCode]);
                    startGameLoop(roomCode);
                }
            }, 3500);
        }
    });

    socket.on('changeDir', ({roomCode, dir, playerIndex}) => {
        const room = rooms[roomCode];
        if (room && room.state === 'playing') {
            const player = room.players[playerIndex];
            if (player) {
                if (
                    (player.dir === 'UP' && dir !== 'DOWN') ||
                    (player.dir === 'DOWN' && dir !== 'UP') ||
                    (player.dir === 'LEFT' && dir !== 'RIGHT') ||
                    (player.dir === 'RIGHT' && dir !== 'LEFT')
                ) {
                    player.dir = dir;
                }
            }
        }
    });

    socket.on('disconnect', () => {
        for (const code in rooms) {
            const room = rooms[code];
            if (room.players.some(p => p.id === socket.id)) {
                room.state = 'gameover';
                io.to(code).emit('stateUpdate', room);
                delete rooms[code];
            }
        }
    });
});

let gameInterval;

function startGameLoop(roomCode) {
    if (gameInterval) clearInterval(gameInterval);
    const room = rooms[roomCode];
    
    gameInterval = setInterval(() => {
        if (!rooms[roomCode] || room.state !== 'playing') return clearInterval(gameInterval);

        if (!room.powerup && Math.random() < 0.05) {
            let validPos = false;
            while(!validPos) {
                let px = Math.floor(Math.random() * GRID_SIZE);
                let py = Math.floor(Math.random() * GRID_SIZE);
                let collision = room.players.some(p => p.trail.some(t => t.x === px && t.y === py));
                if (!collision) {
                    room.powerup = { x: px, y: py };
                    validPos = true;
                }
            }
        }

        let crashOccurred = false;

        room.players.forEach(p => {
            if (!p.alive) return;

            let nextX = p.x;
            let nextY = p.y;
            if (p.dir === 'UP') nextY -= 1;
            if (p.dir === 'DOWN') nextY += 1;
            if (p.dir === 'LEFT') nextX -= 1;
            if (p.dir === 'RIGHT') nextX += 1;

            if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
                p.alive = false;
                crashOccurred = true;
                return;
            }

            let hitTrail = false;
            room.players.forEach(op => {
                if (op.trail.some(t => t.x === nextX && t.y === nextY)) hitTrail = true;
            });
            
            if (hitTrail) {
                p.alive = false;
                crashOccurred = true;
                return;
            }

            p.x = nextX;
            p.y = nextY;
            p.trail.push({ x: p.x, y: p.y });
            
            // NEW: Keep the trail short and tense!
            if (p.trail.length > MAX_TRAIL_LENGTH) {
                p.trail.shift(); 
            }

            if (room.powerup && p.x === room.powerup.x && p.y === room.powerup.y) {
                p.score += 1;
                room.powerup = null;
                
                // Power-up now gives a speed boost instead of shrinking trail
                if (room.speed > 60) { 
                    room.speed -= 5; 
                    clearInterval(gameInterval);
                    startGameLoop(roomCode); 
                }
            }
        });

        if (crashOccurred) {
            io.to(roomCode).emit('crashEffect');
        }

        const alivePlayers = room.players.filter(p => p.alive);
        if (alivePlayers.length <= 1) {
            room.state = 'gameover';
        }

        io.to(roomCode).emit('stateUpdate', room);
    }, room.speed); 
}

server.listen(3000, () => console.log('Server running on http://localhost:3000'));