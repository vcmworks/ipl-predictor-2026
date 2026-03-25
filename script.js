const API = "https://script.google.com/macros/s/AKfycbzm7dl-JgqCLI6YCsisyhwbqxmAcLDYBC1Lfn4Dk6h7HmFRjWWYzQQcJ7hL4SWu-h0nFQ/exec";
            //https://script.google.com/macros/s/AKfycbzm7dl-JgqCLI6YCsisyhwbqxmAcLDYBC1Lfn4Dk6h7HmFRjWWYzQQcJ7hL4SWu-h0nFQ/exec
//const API = "GOOGLE_SHEET_URL";
// 1. PAGE LOAD LOGIC
window.onload = () => {
    const session = JSON.parse(localStorage.getItem('ipl_session'));
    if (session) {
        if(document.getElementById('loginOverlay')) document.getElementById('loginOverlay').classList.add('hidden');
        loadDashboard();
    }
};

// 2. AUTHENTICATION
async function handleLogin() {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value.trim();
    const btn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('loginError');

    if (!u || !p) return alert("Please enter credentials");

    btn.innerText = "AUTHENTICATING...";
    errorMsg.classList.add('hidden');

    try {
        const res = await fetch(`${API}?action=login&u=${encodeURIComponent(u)}&p=${encodeURIComponent(p)}`);
        const data = await res.json();

        if (data.status === "SUCCESS") {
            localStorage.setItem('ipl_session', JSON.stringify(data));
            location.reload(); 
        } else {
            errorMsg.classList.remove('hidden');
            btn.innerText = "Login to Predict";
        }
    } catch (e) {
        console.error("Login Error:", e);
        btn.innerText = "Login to Predict";
        alert("Server connection failed. Ensure Google Script is deployed as 'Anyone'.");
    }
}

// 3. DASHBOARD LOGIC (Rolling 7 Matches + Locking)
async function loadDashboard() {
    const session = JSON.parse(localStorage.getItem('ipl_session'));
    const grid = document.getElementById('matchGrid');

    try {
        const res = await fetch(`${API}?action=getDashboard&user=${session.username}`);
        const data = await res.json();
        
        const now = new Date();

        // Filter: Next 7 matches that don't have a winner declared yet
        const upcoming = data.matches.slice(1)
            .filter(m => !m[6] || m[6].trim() === "")
            .sort((a,b) => {
                // Handle DD/MM/YYYY to YYYY-MM-DD for reliable sorting
                const dateA = a[1].split('/').reverse().join('-');
                const dateB = b[1].split('/').reverse().join('-');
                return new Date(`${dateA}T${a[2]}`) - new Date(`${dateB}T${b[2]}`);
            })
            .slice(0, 7);

        grid.innerHTML = upcoming.map(m => {
            // Construct precise match time
            const dateParts = m[1].split('/');
            const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            const matchTime = new Date(`${formattedDate}T${m[2]}`);
            
            const isLocked = now >= matchTime;
            const userVote = data.userPreds.find(v => v[2] == m[0]);
            const pick = userVote ? userVote[3] : null;

            return `
                <div class="match-card glass p-6 ${isLocked ? 'opacity-60 grayscale shadow-none' : ''}">
                    <div class="flex justify-between text-[11px] font-bold mb-4 uppercase tracking-widest text-slate-400">
                        <span>${m[1]} | ${m[2]} IST</span>
                        <span class="${isLocked ? 'text-red-500 font-black' : 'text-green-600'}">
                            ${isLocked ? '🔒 LOCKED' : '● OPEN'}
                        </span>
                    </div>
                    <div class="flex gap-3 mb-4">
                        <button onclick="handleToggle(event, ${m[0]}, '${m[3]}', '${pick}', '${formattedDate}T${m[2]}')" 
                            ${isLocked ? 'disabled' : ''} 
                            class="team-btn ${pick === m[3] ? 'selected' : ''} ${isLocked ? 'cursor-not-allowed' : ''}">
                            ${m[3]}
                        </button>
                        <button onclick="handleToggle(event, ${m[0]}, '${m[4]}', '${pick}', '${formattedDate}T${m[2]}')" 
                            ${isLocked ? 'disabled' : ''} 
                            class="team-btn ${pick === m[4] ? 'selected' : ''} ${isLocked ? 'cursor-not-allowed' : ''}">
                            ${m[4]}
                        </button>
                    </div>
                    <p class="text-center text-[10px] text-slate-400 font-medium uppercase italic">${m[5]}</p>
                    ${isLocked ? '<p class="text-center text-[9px] text-red-500 font-bold mt-2 uppercase tracking-tighter">Predictions closed</p>' : ''}
                </div>`;
        }).join('');
    } catch (e) {
        console.error("Dashboard Load Error:", e);
    }
}

// 4. TOGGLE LOGIC (With Safety Time-Lock Check)
async function handleToggle(event, matchId, clickedTeam, currentPick, matchTimeStr) {
    const now = new Date();
    const matchTime = new Date(matchTimeStr);

    // Final security check: Prevent voting if time has passed
    if (now >= matchTime) {
        alert("This match has already started! Predictions are locked.");
        return loadDashboard();
    }

    const session = JSON.parse(localStorage.getItem('ipl_session'));
    const btn = event.currentTarget;
    const parent = btn.parentElement;
    
    let actionTeam = clickedTeam;

    // Toggle logic
    if (clickedTeam === currentPick) {
        btn.classList.remove('selected');
        actionTeam = ""; 
    } else {
        parent.querySelectorAll('.team-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    }

    // UI Feedback: Immediate but temporary to handle lag
    btn.style.opacity = "0.5";

    // Update Google Sheets
    try {
        await fetch(API, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify({ 
                action: "vote", 
                user: session.username, 
                matchId: matchId, 
                team: actionTeam 
            }) 
        });
        // Full refresh to sync with server state
        loadDashboard();
    } catch (e) {
        alert("Failed to save prediction. Please check your connection.");
        loadDashboard();
    }
}

function logout() {
    localStorage.clear();
    location.reload();
}