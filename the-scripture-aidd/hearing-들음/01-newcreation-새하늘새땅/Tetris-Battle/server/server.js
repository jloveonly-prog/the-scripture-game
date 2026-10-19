const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, '../client')));

let players = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (playerName) => {
    players[socket.id] = {
      id: socket.id,
      name: playerName,
      score: 0,
      x: 0,
      y: 0,
      isAttacking: false
    };
    io.emit('updatePlayers', players);
    console.log(`${playerName} joined the game.`);
  });

  socket.on('move', (data) => {
    if (players[socket.id]) {
      // Basic move logic will be implemented here
      io.emit('movePlayer', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id];
    io.emit('updatePlayers', players);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
