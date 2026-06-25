const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = {};

// 오목 승리 판정 함수 (4방향 탐색)
function checkWin(board, r, c, stoneType) {
    // 가로, 세로, 우하향 대각선, 우상향 대각선
    const dirR = [0, 1, 1, -1];
    const dirC = [1, 0, 1, 1];

    for (let i = 0; i < 4; i++) {
        let count = 1;

        // 정방향 탐색
        let nr = r + dirR[i];
        let nc = c + dirC[i];
        while (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && board[nr][nc] === stoneType) {
            count++;
            nr += dirR[i];
            nc += dirC[i];
        }

        // 역방향 탐색
        nr = r - dirR[i];
        nc = c - dirC[i];
        while (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && board[nr][nc] === stoneType) {
            count++;
            nr -= dirR[i];
            nc -= dirC[i];
        }

        // 정확히 5개면 승리 (렌주룰/일반 오목 공통 조건)
        if (count === 5) return true;
    }
    return false;
}

io.on('connection', (socket) => {
    socket.on('createRoom', () => {
        const roomId = uuidv4().slice(0, 8);
        rooms[roomId] = {
            players: [socket.id],
            board: Array(15).fill(null).map(() => Array(15).fill(0)),
            turn: 'black',
            isGameOver: false // 게임 종료 상태 추가
        };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', (roomId) => {
        const room = rooms[roomId];
        if (!room || room.players.length >= 2) return;

        socket.join(roomId);
        room.players.push(socket.id);

        if (room.players.length === 2) {
            const roles = Math.random() > 0.5 ? ['black', 'white'] : ['white', 'black'];
            io.to(room.players[0]).emit('startGame', { color: roles[0], roomId, turn: 'black' });
            io.to(room.players[1]).emit('startGame', { color: roles[1], roomId, turn: 'black' });
        }
    });

    socket.on('placeStone', ({ roomId, r, c, color }) => {
        const room = rooms[roomId];
        if (!room || room.turn !== color || room.isGameOver) return;

        r = parseInt(r);
        c = parseInt(c);
        const stoneType = color === 'black' ? 1 : 2;
        room.board[r][c] = stoneType;

        // 1. 착수 신호 먼저 보냄
        io.to(roomId).emit('stonePlaced', { r, c, color });

        // 2. 승리 판정 체크
        if (checkWin(room.board, r, c, stoneType)) {
            room.isGameOver = true;
            io.to(roomId).emit('gameOver', { winner: color });
            return;
        }

        // 3. 승리하지 않았다면 턴 교대
        room.turn = color === 'black' ? 'white' : 'black';
        io.to(roomId).emit('changeTurn', { nextTurn: room.turn });
    });

    socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`서버가 ${PORT}번 포트에서 달리는 중! 🚀`));