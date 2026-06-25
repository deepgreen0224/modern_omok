const socket = io();
let myColor = null;
let currentTurn = 'black';
let roomId = null;
let gameActive = true;
let isHost = false;
let keepAliveInterval = null;

const lobby = document.getElementById('lobby');
const gameArea = document.getElementById('game-area');
const createBtn = document.getElementById('create-btn');
const linkSection = document.getElementById('link-section');
const inviteLinkInput = document.getElementById('invite-link');
const copyBtn = document.getElementById('copy-btn');
const statusMsg = document.getElementById('status-msg');
const boardEl = document.getElementById('board');

const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');

socket.on('connect_error', (err) => {
    statusMsg.innerText = "서버 연결 실패: " + err.message;
});

socket.on('connect', () => {
    if (roomParam && !isHost) {
        roomId = roomParam;
        statusMsg.innerText = "방에 입장하는 중...";
        socket.emit('joinRoom', roomId);
    }
    if (isHost && roomId) {
        statusMsg.innerText = "재연결됨. 방을 다시 생성하는 중...";
        socket.emit('createRoom', roomId);
    }
});

socket.on('disconnect', () => {
    if (!gameArea.classList.contains('hidden')) return;
    statusMsg.innerText = "서버 연결이 끊어졌습니다. 재연결 시도 중...";
});

createBtn.addEventListener('click', () => {
    socket.emit('createRoom');
});

socket.on('roomCreated', (id) => {
    roomId = id;
    isHost = true;
    const inviteUrl = `${window.location.origin}?room=${roomId}`;
    inviteLinkInput.value = inviteUrl;
    linkSection.classList.remove('hidden');
    createBtn.classList.add('hidden');
    statusMsg.innerText = "친구가 링크를 타고 들어올 때까지 대기 중...";

    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = setInterval(() => {
        socket.emit('keepAlive', roomId);
    }, 30000);
});

socket.on('startGame', (data) => {
    myColor = data.color;
    roomId = data.roomId;
    currentTurn = data.turn;
    gameActive = true;

    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }

    lobby.classList.add('hidden');
    gameArea.classList.remove('hidden');

    document.getElementById('my-color').innerText = myColor === 'black' ? '흑 (선공)' : '백 (후공)';
    updateTurnUI();
    createBoard();
});

function createBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener('click', onCellClick);
            boardEl.appendChild(cell);
        }
    }
}

function onCellClick(e) {
    if (!gameActive || currentTurn !== myColor) return;

    const cell = e.currentTarget;
    if (cell.querySelector('.stone')) return;

    const r = cell.dataset.row;
    const c = cell.dataset.col;

    socket.emit('placeStone', { roomId, r, c, color: myColor });
}

socket.on('stonePlaced', ({ r, c, color }) => {
    const cell = boardEl.querySelector(`[data-row='${r}'][data-col='${c}']`);
    const stone = document.createElement('div');
    stone.classList.add('stone', color);
    cell.appendChild(stone);
});

socket.on('changeTurn', ({ nextTurn }) => {
    currentTurn = nextTurn;
    updateTurnUI();
});

socket.on('gameOver', ({ winner }) => {
    gameActive = false;

    setTimeout(() => {
        if (winner === myColor) {
            alert('🎉 축하합니다! 당신이 승리했습니다! WIN! 🎉');
        } else {
            alert('💀 아쉽네요! 상대방이 승리했습니다. LOSE! 💀');
        }
    }, 100);
});

function updateTurnUI() {
    document.getElementById('current-turn').innerText = currentTurn === 'black' ? '흑' : '백';
}

copyBtn.addEventListener('click', () => {
    inviteLinkInput.select();
    document.execCommand('copy');
    alert('초대 링크가 복사되었습니다!');
});

socket.on('errorMsg', (msg) => {
    statusMsg.innerText = msg;
    alert(msg);
});
