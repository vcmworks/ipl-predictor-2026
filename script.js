const API = "https://script.google.com/macros/s/AKfycbyoLpJeaROwNf7aFgh-RVFDoz8bi7hTQtG12xrKKHHQFGjR6HcdlPTqbVeP7lAawTcBDQ/exec";

// --- SESSION & LOGIN ---
window.onload = () => {
    const session = JSON.parse(localStorage.getItem('ipl_session'));
    if (session) {
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('userWelcome').innerText = `Challenger: ${session.name}`;
        loadData();
    }
};

async function handleLogin() {
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;
    const btn = document.getElementById('loginBtn');
    
    btn.innerText = "VERIFYING...";
    
    try {
        const res = await fetch(API, {
            method: 'POST',
            body: JSON.stringify({ action: "login", username, password })
        });
        const data = await res.json();
        
        if (data.status === "SUCCESS") {
            localStorage.setItem('ipl_session', JSON.stringify(data));
            localStorage.setItem('ipl_user', username);
            location.reload();
        } else {
            showLoginError();
        }
    } catch (e) {
        showLoginError();
    }
}

function showLoginError() {
    document.getElementById('loginError').classList.remove('hidden');
    document.getElementById('loginBtn').innerText = "SIGN IN";
}

function logout() {
    localStorage.clear();
    location.reload();
}

// --- DATA LOADING ---
async function loadData() {
    const res = await fetch(API);
    const data = await res.json();
    window.allData = data; 
    renderMatches(data.matches);
}

function renderMatches(matches) {
    const grid = document.getElementById('matchGrid');
    grid.innerHTML = '';
    
    matches.slice(1).forEach(m => {
        const [id, date, time, home, away, venue, winner] = m;
        const matchStart = new Date(`${date}T${time}`);
        const isLocked = new Date() > matchStart;

        grid.innerHTML += `
            <div class="glass-card p-6 flex flex-col justify-between ${isLocked ? 'grayscale opacity-70' : ''}">
                <div>
                    <div class="flex justify-between items-center mb-6">
                        <span class="text-[10px] font-bold text-gray-500 tracking-tighter">${date} | ${time}</span>
                        <span class="text-[10px] px-2 py-1 rounded bg-white/10 ${isLocked ? 'text-red-400' : 'text-cyan-400'}">
                            ${isLocked ? 'LOCKED' : 'ACTIVE'}
                        </span>
                    </div>
                    
                    <div class="flex justify-between items-center text-center gap-2 mb-8">
                        <div class="w-1/3">
                            <div class="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-blue-500/30">
                                <span class="font-bold text-blue-400">${home[0]}</span>
                            </div>
                            <button onclick="vote(${id}, '${home}')" ${isLocked ? 'disabled' : ''} 
                                class="text-xs font-bold uppercase hover:text-cyan-400 transition">${home}</button>
                        </div>
                        
                        <div class="text-xs text-gray-600 font-bold">VS</div>
                        
                        <div class="w-1/3">
                            <div class="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-purple-500/30">
                                <span class="font-bold text-purple-400">${away[0]}</span>
                            </div>
                            <button onclick="vote(${id}, '${away}')" ${isLocked ? 'disabled' : ''} 
                                class="text-xs font-bold uppercase hover:text-cyan-400 transition">${away}</button>
                        </div>
                    </div>
                </div>

                <div class="border-t border-white/5 pt-4">
                    <p class="text-[9px] text-gray-600 uppercase text-center mb-2">${venue}</p>
                    ${winner ? `<div class="text-center text-xs font-bold text-yellow-500 uppercase">Winner: ${winner}</div>` : 
                    `<div class="text-center text-[10px] text-gray-400">No Result Yet</div>`}
                </div>
            </div>
        `;
    });
}

// --- PREDICTION ---
async function vote(matchId, team) {
    if (!confirm(`Confirm prediction for ${team}?`)) return;
    const user = JSON.parse(localStorage.getItem('ipl_session')).name;
    
    await fetch(API, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: "vote", user, matchId, team })
    });
    alert("Prediction Uploaded to Cloud!");
}

// --- ADMIN ---
function adminLogin() {
    const pass = prompt("Enter Master Key:");
    if (pass === "#123user#") {
        document.getElementById('adminModal').classList.remove('hidden');
        const list = document.getElementById('adminList');
        list.innerHTML = window.allData.matches.slice(1).map(m => `
            <div class="bg-white/5 p-4 rounded-2xl flex justify-between items-center border border-white/5">
                <span class="text-xs font-bold">${m[3]} vs ${m[4]}</span>
                <div class="flex gap-2">
                    <button onclick="setWinner(${m[0]}, '${m[3]}')" class="bg-cyan-600 text-[10px] px-3 py-1 rounded-lg">${m[3]}</button>
                    <button onclick="setWinner(${m[0]}, '${m[4]}')" class="bg-purple-600 text-[10px] px-3 py-1 rounded-lg">${m[4]}</button>
                </div>
            </div>
        `).join('');
    }
}

async function setWinner(matchId, winner) {
    await fetch(API, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: "updateWinner", password: "#123user#", matchId, winner })
    });
    alert("Cloud Database Updated!");
    location.reload();
}

function closeAdmin() { document.getElementById('adminModal').classList.add('hidden'); }
