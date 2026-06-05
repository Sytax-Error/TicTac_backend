
---

# Backend `README.md`

```md
# Multiplayer Tic Tac Toe Backend

This is the backend server for a real-time multiplayer Tic Tac Toe game.

The backend is built with **Node.js**, **Express.js**, and **Socket.io**. It manages rooms, players, game state, turns, winner detection, draw detection, score, and real-time updates.

---

## Features

- Socket.io real-time communication
- Create room automatically
- Join room using room code
- Assign first player as X
- Assign second player as O
- Allow only two players per room
- Server-side board state
- Turn validation
- Invalid move validation
- Winner detection
- Draw detection
- Winning cell tracking
- Scoreboard state
- Reset game
- Leave room
- Delete room when empty
- Opponent left event
- Play again request flow
- Accept/reject play again request

---

## Tech Stack

- Node.js
- Express.js
- Socket.io
- CORS

---

## Project Structure

```txt
tic-tac-toe-backend/
├── server.js
└── package.json

Install Dependencies
npm install
Run Backend
npm run dev

Backend runs on:

http://localhost:5000
Network Setup

To allow frontend from another device on the same network, the backend should listen on 0.0.0.0.

server.listen(5000, "0.0.0.0", () => {
  console.log("Server running on port 5000");
});

Then frontend can connect using:

http://YOUR_IP:5000

Example:

http://192.168.1.10:5000
Test Backend

Open in browser:

http://localhost:5000

Expected response:

Backend is running.
Backend Responsibilities

The backend is the source of truth for the game.

It handles:

Room creation
Player joining
Player assignment
Board state
Turn state
Winner state
Score state
Winning cells
Move validation
Draw validation
Reset game
Leave room
Disconnect cleanup
Play again request flow
Room State Structure

Each room is stored in memory like this:

{
  roomId: "123",
  players: [
    {
      socketId: "socket_id_1",
      username: "Player 1",
      symbol: "X"
    },
    {
      socketId: "socket_id_2",
      username: "Player 2",
      symbol: "O"
    }
  ],
  board: [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ],
  currentTurn: "X",
  winner: null,
  winningCells: [],
  score: {
    X: 0,
    O: 0
  }
}
Game Board Values
0 = empty cell
X = player X move
O = player O move

Example:

[
  ["X", "X", "X"],
  ["O", 0, "O"],
  [0, 0, 0]
]
Game Rules
First player in room gets X
Second player gets O
Maximum two players allowed in one room
X always starts first
Only current turn player can move
Filled cells cannot be selected again
Winner is checked after every valid move
Draw is checked when all cells are filled
Score increases only when a player wins
Score does not reset on play again
Room is deleted when all players leave
Socket Events
Frontend to Backend
join-room

Used when player joins or creates a room.

socket.emit("join-room", {
  username: "Lavesh",
  roomId: "123"
});

Backend:

Creates room if it does not exist
Adds player
Assigns X or O
Emits player-assigned
Emits room-update
make-move

Used when player clicks a cell.

socket.emit("make-move", {
  roomId: "123",
  rowIndex: 0,
  colIndex: 1
});

Backend validates:

Room exists
Player exists
Game is not already over
It is player's turn
Cell is empty
Position is valid

Then backend updates board and emits room-update.

reset-game

Used to reset current board.

socket.emit("reset-game", {
  roomId: "123"
});

Backend resets:

Board
Current turn
Winner
Winning cells

Score remains unchanged.

leave-room

Used when player leaves room manually.

socket.emit("leave-room", {
  roomId: "123"
});

Backend:

Removes player
Emits player-left to opponent
Emits room-update
Deletes room if empty
play-again-request

Used when one player wants to play again.

socket.emit("play-again-request", {
  roomId: "123"
});

Backend sends request to opponent using play-again-requested.

play-again-accepted

Used when opponent accepts play again request.

socket.emit("play-again-accepted", {
  roomId: "123"
});

Backend resets board and emits:

room-update
play-again-started
play-again-rejected

Used when opponent rejects play again request.

socket.emit("play-again-rejected", {
  roomId: "123"
});

Backend emits play-again-rejected to requester.

Backend to Frontend Events
player-assigned

Sent only to the joining player.

{
  username: "Lavesh",
  roomId: "123",
  symbol: "X"
}
room-update

Sent to all players in a room.

{
  roomId,
  players,
  board,
  currentTurn,
  winner,
  winningCells,
  score
}
move-error

Sent when move is invalid.

Examples:

Room is full
Invalid board position
This cell is already filled
Wait for your turn
Game is already over
player-left

Sent to opponent when player leaves.

{
  username: "Player 1",
  message: "Player 1 left the room"
}
play-again-requested

Sent to opponent when player requests a new match.

{
  username: "Player 1",
  symbol: "X",
  message: "Player 1 wants to play again"
}
play-again-started

Sent to both players when new game starts.

play-again-rejected

Sent when opponent rejects request.

{
  message: "Player 2 rejected the play again request"
}
Important Backend Functions
createBoard

Creates empty Tic Tac Toe board.

const createBoard = () => [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
];
checkWinner

Checks rows, columns, and diagonals.

Returns:

{
  winner: "X",
  winningCells: [
    [0, 0],
    [0, 1],
    [0, 2]
  ]
}

or:

null
checkDraw

Checks if board is full and no winner exists.

function checkDraw(board) {
  return board.flat().every((cell) => cell !== 0);
}
emitRoomUpdate

Sends updated game state to all players in a room.

function emitRoomUpdate(roomId) {
  const room = rooms[roomId];

  if (!room) return;

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
Local Network Testing

Find your machine IP.

Linux / Ubuntu
hostname -I
Windows
ipconfig

Use that IP in frontend socket.js:

export const socket = io("http://YOUR_IP:5000");

Example:

export const socket = io("http://192.168.1.10:5000");
Firewall

If frontend cannot connect from another device, allow backend port:

sudo ufw allow 5000
Notes

Rooms are currently stored in memory:

const rooms = {};

This means if backend restarts, all room data is cleared.

For production, use a database like:

MongoDB
Redis
PostgreSQL
Future Improvements
Store rooms in database
Add user authentication
Add reconnect using user ID
Add spectator mode
Add room password
Add match history
Add timer per move
Add Docker setup
Add deployment config
Add TypeScript
Add unit tests