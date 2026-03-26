const API = "https://script.google.com/macros/s/AKfycbxju6I3rdmrhBLmpTxQq-tXuDE5T919INk2UzDEy_fSig0vkfta4r3AwQ3p6-QvHNJ7iQ/exec"; 

// 1. SESSION CHECK & INITIAL LOAD
window.onload = () => {
    const session = JSON.parse(localStorage.getItem('ipl_session'));
    if (session) {
        // Exclude Admin from Prediction View
        if (session.username.toLowerCase() === "admin") {
            document.body.innerHTML = `
                <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#FFD700; font-family:sans-serif;">
                    <div class="glass" style="padding:40px; text-align:center; background:white; border-radius:20px; box-shadow:0 10px 20px rgba(0,0,0,0.1);">
                        <h2 style="color:#000080;">Admin Access</h2>
                        <p>Please use the Google Sheet to update match winners.</p>
                        <button onclick="logout()" style="margin-top:20px; padding:10px 20px; background:#ef4444; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">Logout</button>
                    </div>
                </div>`;
            return;
        }
        // Hide login and show dashboard
        const overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.classList.add('hidden');
        loadDashboard();
    }
};

// 2. LOGIN LOGIC
async function handleLogin() {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value.trim();
    const btn = document.getElementById('loginBtn');
    
    if (!u || !p) {
        alert("Please enter both username and password.");
        return;
    }

    btn.innerText = "VERIFYING...";
    btn.disabled = true;

    try {
        // Note: Using a GET request for login to receive the JSON response
        const res = await fetch(`${API}?action=login&u=${encodeURIComponent(u)}&p=${encodeURIComponent(p)}`);
        const data = await res.json();

        if (data.status === "SUCCESS") {
            localStorage.setItem('ipl_session', JSON.stringify(data));
            location.reload(); 
        } else {
            alert("❌ Invalid Credentials. Try again.");
            btn.innerText = "Start Predicting";
            btn.disabled = false;
        }
    } catch (e) {
        console.error("Login Error:", e);
        alert("📡 Connection Error: Ensure your Apps Script is deployed to 'Anyone'.");
        btn.innerText = "Start Predicting";
        btn.disabled = false;
    }
}

// 3. LOAD DASHBOARD (Only shows future/open matches)
async function loadDashboard() {
    const session = JSON.parse(localStorage.getItem('ipl_session'));
    const grid = document.getElementById('matchGrid');
    if (!grid) return;

    try {
        const res = await fetch(`${API}?action=getDashboard&user=${session.username}`);
        const data = await res.json();

        if (!data.matches || data.matches.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-20">
                    <p style="font-weight:900; color:#000080; opacity:0.5; text-transform:uppercase; letter-spacing:2px;">
                        No matches currently open for prediction
                    </p>
                </div>`;
            return;
        }

        grid.innerHTML = data.matches.map(m => {
            const userVote = data.userPreds.find(v => v[2] == m[0]);
            const currentPick = userVote ? userVote[3] : null;

            return `
                <div class="match-card glass p-6 animate-fade-in shadow-sm">
                    <div class="flex justify-between text-[10px] font-black mb-4 uppercase text-slate-400">
                        <span>${m[1]} | ${m[2]} IST</span>
                        <span style="color:#128807;">● Open</span>
                    </div>
                    <div class="flex gap-3 mb-4">
                        <button onclick="handleToggle(this, ${m[0]}, '${m[3]}', '${currentPick}')" 
                            class="team-btn ${currentPick === m[3] ? 'selected' : ''}">
                            ${m[3]}
                        </button>
                        <button onclick="handleToggle(this, ${m[0]}, '${m[4]}', '${currentPick}')" 
                            class="team-btn ${currentPick === m[4] ? 'selected' : ''}">
                            ${m[4]}
                        </button>
                    </div>
                    <div class="text-[9px] text-slate-400 font-bold uppercase italic text-center">Match #${m[0]}</div>
                </div>`;
        }).join('');
    } catch (e) {
        console.error("Dashboard Load Error:", e);
        grid.innerHTML = `<p class="text-center text-red-500">Failed to load matches.</p>`;
    }
}

// 4. PREDICTION TOGGLE LOGIC
async function handleToggle(btn, matchId, clickedTeam, currentPick) {
    const session = JSON.parse(localStorage.getItem('ipl_session'));
    
    // Logic: If clicking the team you already picked, it "unselects" (sets to empty)
    const newPick = (clickedTeam === currentPick) ? "" : clickedTeam;

    // UI REACTION (Immediate)
    const buttons = btn.parentElement.querySelectorAll('.team-btn');
    buttons.forEach(b => b.classList.remove('selected'));
    
    if (newPick !== "") {
        btn.classList.add('selected');
    }

    try {
        // Send to Apps Script
        await fetch(API, {
            method: 'POST',
            mode: 'no-cors', // Essential for Apps Script POST
            body: JSON.stringify({
                action: "vote",
                user: session.username,
                matchId: matchId,
                team: newPick
            })
        });

        // Refresh slightly later to sync the 'currentPick' variable for the next click
        setTimeout(loadDashboard, 1000); 
    } catch (e) {
        console.error("Voting Error:", e);
        alert("Action failed. Check your internet connection.");
        loadDashboard(); // Reset UI
    }
}

// 5. LOGOUT
function logout() {
    localStorage.clear();
    location.reload();
}