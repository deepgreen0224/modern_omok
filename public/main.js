const socket = io();
let myColor = null;
let currentTurn = 'black';
let roomId = null;
let gameActive = true; // 게임 진행 중인지 여부

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

if (roomParam) {
    roomId = roomParam;
    statusMsg.innerText = "서버에 연결하는 중...";
    if (socket.connected) {
        socket.emit('joinRoom', roomId);
    } else {
        socket.on('connect', () => {
            statusMsg.innerText = "방에 입장하는 중...";
            socket.emit('joinRoom', roomId);
        });
    }
}

createBtn.addEventListener('click', () => {
    socket.emit('createRoom');
});

socket.on('roomCreated', (id) => {
    roomId = id;
    const inviteUrl = `${window.location.origin}?room=${roomId}`;
    inviteLinkInput.value = inviteUrl;
    linkSection.classList.remove('hidden');
    createBtn.classList.add('hidden');
    statusMsg.innerText = "친구가 링크를 타고 들어올 때까지 대기 중...";
});

socket.on('startGame', (data) => {
    myColor = data.color;
    roomId = data.roomId;
    currentTurn = data.turn;
    gameActive = true;

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

// 돌이 놓였다는 신호 처리
socket.on('stonePlaced', ({ r, c, color }) => {
    const cell = boardEl.querySelector(`[data-row='${r}'][data-col='${c}']`);
    const stone = document.createElement('div');
    stone.classList.add('stone', color);
    cell.appendChild(stone);
});

// 턴이 바뀌었다는 신호 처리
socket.on('changeTurn', ({ nextTurn }) => {
    currentTurn = nextTurn;
    updateTurnUI();
});

// 게임 종료 신호 처리 
socket.on('gameOver', ({ winner }) => {
    gameActive = false; // 더 이상 돌을 못 놓게 막음
    
    setTimeout(() => {
        if (winner === myColor) {
            alert('🎉 축하합니다! 당신이 승리했습니다! WIN! 🎉');
        } else {
            alert('💀 아쉽네요! 상대방이 승리했습니다. LOSE! 💀');
        }
    }, 100); // 돌이 놓이는 그래픽을 보고 팝업이 뜨도록 약간의 시간차를 둠
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
    alert(msg);
});