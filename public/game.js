const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Connect to the Socket.IO server (we will use this later for multiplayer)
const socket = io();

// A simple player object
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    color: '#00ffcc' // Neon cyan
};

// This function runs 60 times a second to draw the game
function gameLoop() {
    // Clear the previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the player
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    
    // Add the neon glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = player.color;
    ctx.fillStyle = player.color;
    
    ctx.fill();
    ctx.closePath();

    // Call the next frame
    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Connect to the Socket.IO server (we will use this later for multiplayer)
const socket = io();

// A simple player object
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    color: '#00ffcc' // Neon cyan
};

// This function runs 60 times a second to draw the game
function gameLoop() {
    // Clear the previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the player
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    
    // Add the neon glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = player.color;
    ctx.fillStyle = player.color;
    
    ctx.fill();
    ctx.closePath();

    // Call the next frame
    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();