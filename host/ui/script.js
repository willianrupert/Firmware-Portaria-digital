const stateDot = document.getElementById('state-dot');
const stateText = document.getElementById('state-text');
const timeDisplay = document.getElementById('time-display');
const uptimeDisplay = document.getElementById('uptime-display');
const weightDisplay = document.getElementById('weight-display');
const receiptToken = document.getElementById('receipt-token');

let socket;
let reconnectInterval = 3000;
let startTime = Date.now();

// Mapeamento de Estados para IDs de Tela
const screens = {
    "IDLE": "screen-idle",
    "AWAKE": "screen-awake",
    "WAITING_QR": "screen-waiting-qr",
    "AUTHORIZED": "screen-authorized",
    "INSIDE_WAIT": "screen-authorized", // Reutiliza authorized
    "DELIVERING": "screen-delivering",
    "DOOR_REOPENED": "screen-delivering", // Reutiliza delivering
    "CONFIRMING": "screen-confirming",
    "RECEIPT": "screen-receipt"
};

function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`[Socket] Conectando em ${wsUrl}...`);
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log('[Socket] Conectado.');
        updateStatusIndicator('ONLINE');
    };

    socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        console.log('[Socket] Mensagem:', payload);
        
        if (payload.event === 'STATE_TRANSITION') {
            switchScreen(payload.state);
            updateUI(payload);
        }
    };

    socket.onclose = () => {
        console.log('[Socket] Desconectado. Tentando reconectar...');
        updateStatusIndicator('OFFLINE');
        setTimeout(connect, reconnectInterval);
    };

    socket.onerror = (err) => {
        console.error('[Socket] Erro:', err);
        socket.close();
    };
}

function switchScreen(state) {
    const targetId = screens[state] || "screen-idle";
    
    // Esconde todas as telas
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    // Mostra a tela alvo
    const target = document.getElementById(targetId);
    if (target) {
        target.classList.add('active');
    }

    // Atualiza Texto da Barra de Status
    stateText.innerText = state;
    
    // Atualiza Cor do Ponto de Status
    stateDot.className = '';
    if (state === 'IDLE') stateDot.classList.add('dot-idle');
    else if (state === 'RECEIPT') stateDot.classList.add('dot-success');
    else stateDot.classList.add('dot-active');
}

function updateUI(payload) {
    if (payload.weight !== undefined) {
        weightDisplay.innerText = payload.weight.toFixed(1);
    }
    
    if (payload.state === 'RECEIPT' && payload.jwt) {
        // Pega os últimos 8 caracteres como token visual
        receiptToken.innerText = payload.jwt.slice(-8).toUpperCase();
    }
}

function updateStatusIndicator(status) {
    if (status === 'OFFLINE') {
        stateText.innerText = 'OFFLINE';
        stateDot.style.color = '#ff3366';
        stateDot.style.background = '#ff3366';
    }
}

// Relógio e Uptime
setInterval(() => {
    const now = new Date();
    timeDisplay.innerText = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const upSec = Math.floor((Date.now() - startTime) / 1000);
    const upMin = Math.floor(upSec / 60);
    uptimeDisplay.innerText = `Uptime: ${upMin}m`;
}, 1000);

// Iniciar conexão
connect();
