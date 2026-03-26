const API = "https://script.google.com/macros/s/AKfycbzm7dl-JgqCLI6YCsisyhwbqxmAcLDYBC1Lfn4Dk6h7HmFRjWWYzQQcJ7hL4SWu-h0nFQ/exec";
        //     https://script.google.com/macros/s/AKfycbzm7dl-JgqCLI6YCsisyhwbqxmAcLDYBC1Lfn4Dk6h7HmFRjWWYzQQcJ7hL4SWu-h0nFQ/exec
//https://script.google.com/macros/s/AKfycbzm7dl-JgqCLI6YCsisyhwbqxmAcLDYBC1Lfn4Dk6h7HmFRjWWYzQQcJ7hL4SWu-h0nFQ/exec
// GitHub Action will replace this with your Secret URL during deployment
//const API = "GITHUB_SECRET_API_URL"; 

// 1. PAGE LOAD LOGIC
window.onload = () => {
    const session = JSON.parse(localStorage.getItem('ipl_session'));
    if (session) {
        // If logged in, hide overlay and load the match center
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
    if(errorMsg) errorMsg.classList.add('hidden');

    try {
        const res = await fetch(`${API}?action=login&u=${encodeURIComponent(u)}&p=${encodeURIComponent(p)}`);
        const data = await res.json();

        if (data.status === "SUCCESS") {
            localStorage.setItem('ipl_session', JSON.stringify(data));
            location.reload(); 
        } else {
            if(errorMsg) errorMsg.classList.remove('hidden');
            btn.innerText = "Login to Predict";
        }
    } catch (e) {
        console.error("Login Error:", e);
        btn.innerText = "Login to Predict";
        alert("Connection failed. Ensure Google Script is deployed as 'Anyone'.");
    }
}

// 3. DASHBOARD LOGIC (Rolling 7 Matches + German Time + Locking)
async function loadDashboard() {
    const session = JSON.parse(localStorage.getItem('ipl_session'));
    const grid = document.getElementById('matchGrid');
    if (!grid) return;

    try {
        const res = await fetch(`${API}?action=getDashboard&user=${session.username}`);
        const data = await res.json();
        
        const now = new Date();

        // Filter: Next 7 matches where no winner is declared yet
        const upcoming = data.matches.slice(1)
            .filter(m => !m[6] || m[6].trim() === "")
            .sort((a, b) => {
                const dateA = a[1].split('/').reverse().join('-');
                const dateB = b[1].split('/').reverse().join('-');
                return new Date(`${dateA}T${a[2]}`) - new Date(`${dateB}T${b[2]}`);
            })
            .slice(0, 7);

        grid.innerHTML = upcoming.map(m => {
            // Construct the IST match time from Google Sheet (IST is UTC+5:30)
            const dateParts = m[1].split('/');
            const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            const istMatchTime = new Date(`${formattedDate}T${m[2]}:00+05:30`);
            
            // Convert to German Time (CET/CEST)
            const germanTimeStr = istMatchTime.toLocaleTimeString('de-DE', {
                timeZone: 'Europe/Berlin',
                hour: '2-digit',
                minute: '2-digit'
            });

            const germanDateStr = istMatchTime.toLocaleDateString('de-DE', {
                timeZone: 'Europe/Berlin',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            const isLocked = now >= istMatchTime;
            const userVote = data.userPreds.find(v => v[2] == m[0]);
            const pick = userVote ? userVote[3] : null;

            return `
                <div class="match-card glass p-6 ${isLocked ? 'opacity-60 grayscale' : ''}">
                    <div class="flex justify-between text-[11px] font-bold mb-4 uppercase tracking-widest text-slate-400">
                        <span>${germanDateStr} | ${germanTimeStr} (DE Time)</span>
                        <span class="${isLocked ? 'text-red-500 font-black' : 'text-green-600'}">
                            ${isLocked ? '🔒 LOCKED' : '● OPEN'}
                        </span>
                    </div>
                    <div class="flex gap-3 mb-4">
                        <button onclick="handleToggle(event, ${m[0]}, '${m[3]}', '${pick}', '${istMatchTime.toISOString()}')" 
                            ${isLocked ? 'disabled' : ''} 
                            class="team-btn ${pick === m[3] ? 'selected' : ''} ${isLocked ? 'cursor-not-allowed' : ''}">
                            ${m[3]}
                        </button>
                        <button onclick="handleToggle(event, ${m[0]}, '${m[4]}', '${pick}', '${istMatchTime.toISOString()}')" 
                            ${isLocked ? 'disabled' : ''} 
                            class="team-btn ${pick === m[4] ? 'selected' : ''} ${isLocked ? 'cursor-not-allowed' : ''}">
                            ${m[4]}
                        </button>
                    </div>
                    <div class="text-center pt-2 border-t border-slate-100">
                        <p class="text-[9px] text-slate-400 uppercase italic">IST: ${m[2]} | ${m[5]}</p>
                        ${isLocked ? '<p class="text-[9px] text-red-500 font-bold mt-1 uppercase">Predictions Closed</p>' : ''}
                    </div>
                </div>`;
        }).join('');
    } catch (e) {
        console.error("Dashboard Load Error:", e);
    }
}

// 4. TOGGLE LOGIC (Select / Unselect / Time-Security)
async function handleToggle(event, matchId, clickedTeam, currentPick, isoTime) {
    const now = new Date();
    const matchTime = new Date(isoTime);

    // Final security check: Prevent voting if match has started
    if (now >= matchTime) {
        alert("🔒 This match has already started in Germany/India! Predictions are locked.");
        return loadDashboard();
    }

    const session = JSON.parse(localStorage.getItem('ipl_session'));
    const btn = event.currentTarget;
    const parent = btn.parentElement;
    
    let actionTeam = clickedTeam;

    // Toggle Logic: If clicking the same team, remove the selection
    if (clickedTeam === currentPick) {
        btn.classList.remove('selected');
        actionTeam = ""; 
    } else {
        // Switch selection to the new team
        parent.querySelectorAll('.team-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    }

    // UI Feedback: Fade button slightly while saving
    btn.style.opacity = "0.7";

    // Send update to Google Sheets
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
        // Silent refresh to ensure state is synced
        loadDashboard();
    } catch (e) {
        alert("Failed to save prediction. Check your internet.");
        loadDashboard();
    }
}

// 5. LOGOUT
function logout() {
    localStorage.clear();
    location.reload();
}
