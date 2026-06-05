import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express(); // create express app

app.get("/", (req, res) => {
  res.send("Backend is running.");
});

app.get("/hello", (req, res) => {
  res.send("Hello Server");
});

const server = http.createServer(app); //creates actual HTTP server.

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const rooms = {};
const createBoard = () => [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
];

// io = entire Socket.io server
// socket = one connected user

function checkWinner(board) {
  const lines = [
    [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
    ],

    [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
    ],

    [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    [
      [0, 2],
      [1, 1],
      [2, 0],
    ],
  ];

  for (const line of lines) {
    const values = line.map(([r, c]) => board[r][c]);

    if (values.every((cell) => cell === "X")) {
      return { winner: "X", winningCells: line };
    }

    if (values.every((cell) => cell === "O")) {
      return { winner: "O", winningCells: line };
    }
  }

  return null;
}

function checkDraw(board) {
  return board.flat().every((cell) => cell !== 0);
}

io.on("connection", (socket) => {
  // If THIS user sends event "join-room"
  // then run this function
  socket.on("join-room", (data) => {
    const { username, roomId } = data;
    if (!rooms[roomId]) {
      rooms[roomId] = {
        roomId,
        players: [],
        board: createBoard(),
        currentTurn: "X",
        winner: null,
        winningCells: [],
        score: {
          X: 0,
          O: 0,
        },
      };
    }
    // Same Player not allowed
    const alreadyJoined = rooms[roomId].players.find(
      (player) => player.socketId === socket.id,
    );

    if (alreadyJoined) {
      return;
    }

    // only tow playes allowed on single room
    if (rooms[roomId].players.length >= 2) {
      return;
    }

    const hasX = rooms[roomId].players.some((p) => p.symbol === "X");
    const hasO = rooms[roomId].players.some((p) => p.symbol === "O");

    let symbol = null;

    if (!hasX) {
      symbol = "X";
    } else if (!hasO) {
      symbol = "O";
    } else {
      console.log("Room is Full");
      return;
    }
    //*********** */ pushing the players on same room ***********
    rooms[roomId].players.push({
      socketId: socket.id,
      username,
      symbol,
    });

    // join socket room first
    socket.join(roomId);

    // send only current player his symbol
    socket.emit("player-assigned", {
      username,
      roomId,
      symbol,
    });

    // send updated players to everyone in room
    io.to(roomId).emit("room-update", {
      roomId,
      players: rooms[roomId].players,
      board: rooms[roomId].board,
      currentTurn: rooms[roomId].currentTurn,
      winner: rooms[roomId].winner,
      winningCells: rooms[roomId].winningCells,
      score: rooms[roomId].score,
    });
  });

  socket.on("make-move", (data) => {
    // console.log("Move Recived: ", data);
    // Move Recived:  { roomId: '123123123', rowIndex: 0, colIndex: 0 }

    const { roomId, rowIndex, colIndex } = data;
    const room = rooms[roomId];
    if (!room) return;

    const player = room?.players.find(
      (player) => player.socketId === socket.id,
    );

    if (!player) {
      return;
    }

    if (room.winner) {
      socket.emit("move-error", {
        message: `Game is already over. Winner is ${room.winner}`,
      });
      return;
    }

    if (player.symbol !== room.currentTurn) {
      socket.emit("move-error", {
        message: `Wait for your turn. Current turn is ${room.currentTurn}`,
      });
      return;
    }

    if (room.board[rowIndex][colIndex] !== 0) {
      socket.emit("move-error", {
        message: "This cell is already filled",
      });
      return;
    }

    room.board[rowIndex][colIndex] = player.symbol;

    const result = checkWinner(room.board);

    if (result) {
      room.winner = result.winner;
      room.winningCells = result.winningCells;
      room.score[result.winner] += 1;
    } else if (checkDraw(room.board)) {
      room.winner = "Draw";
    }

    if (!room.winner) {
      room.currentTurn = room.currentTurn === "X" ? "O" : "X";
    }

    io.to(roomId).emit("room-update", {
      roomId,
      players: room.players,
      board: room.board,
      currentTurn: room.currentTurn,
      winner: room.winner,
      winningCells: room.winningCells,
      score: room.score,
    });
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];

      room.players = room.players.filter(
        (player) => player.socketId !== socket.id,
      );

      if (room.players.length === 0) {
        delete rooms[roomId];
        continue;
      }

      io.to(roomId).emit("room-update", {
        roomId,
        players: room.players,
        board: room.board,
        currentTurn: room.currentTurn,
        winner: room.winner,
        winningCells: room.winningCells,
        score: room.score,
      });
    }
  });

  socket.on("reset-game", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.winningCells = [];
    room.board = createBoard();
    room.currentTurn = "X";
    room.winner = null;

    io.to(roomId).emit("room-update", {
      roomId,
      players: room.players,
      board: room.board,
      currentTurn: room.currentTurn,
      winner: room.winner,
      winningCells: room.winningCells,
      score: room.score,
    });
  });

  socket.on("leave-room", ({ roomId }) => {
    const room = rooms[roomId];

    if (!room) return;

    const player = room.players.find((p) => p.socketId === socket.id);

    if (!player) return;

    room.players = room.players.filter((p) => p.socketId !== socket.id);

    socket.leave(roomId);

    socket.to(roomId).emit("player-left", {
      username: player.username,
      message: `${player.username} left the room`,
    });

    if (room.players.length === 0) {
      delete rooms[roomId];
      return;
    }
    io.to(roomId).emit("room-update", {
      roomId,
      players: room.players,
      board: room.board,
      currentTurn: room.currentTurn,
      winner: room.winner,
      winningCells: room.winningCells,
      score: room.score,
    });
  });
});

//starts the server.
server.listen(5000, () => {
  console.log("Server running on port 5000");
});
