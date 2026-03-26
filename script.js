const API = "https://script.google.com/macros/s/AKfycbxju6I3rdmrhBLmpTxQq-tXuDE5T919INk2UzDEy_fSig0vkfta4r3AwQ3p6-QvHNJ7iQ/exec"; 

window.onload = () => {
    const session = JSON.parse(localStorage.getItem('ipl_session'));
    if (session) {
        if (session.username.toLowerCase() === "admin") {
            // Optional: Redirect admin or show a different view
            document.body.innerHTML = `<div class="p-20 text-center">Admin should use the Sheet to update winners. <button onclick="logout()" class="text-blue-500 underline">Logout</button></div>`;
            return;
        }
        document.getElementById('loginOverlay').classList.add('hidden');
        loadDashboard();
    }
};

async function handleLogin() {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value.trim();
    const btn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('loginError');

    if (!u || !p) return;
    btn.innerText = "VERIFYING...";
    errorMsg.classList.add('hidden');

    try {
        // GET request to check credentials
        const res = await fetch(`${API}?action=login&u=${encodeURIComponent(u)}&p=${encodeURIComponent(p)}`);
        const data = await res.json();

        if (data.status === "SUCCESS") {
            localStorage.setItem('ipl_session', JSON.stringify(data));
            location.reload(); 
        } else {
            errorMsg.classList.remove('hidden');
            btn.innerText = "Enter Arena";
        }
    } catch (e) {
        console.error(e);
        alert("Connection Error. Make sure you deployed as 'Anyone'.");
        btn.innerText = "Enter Arena";
    }
}

async function loadDashboard() {
    const session = JSON.parse(localStorage.getItem('ipl_session'));
    const grid = document.getElementById('matchGrid');
    
    try {
        const res = await fetch(`${API}?action=getDashboard&user=${session.username}`);
        const data = await res.json();

        if (data.matches.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400 font-bold">NO UPCOMING MATCHES OPEN</div>`;
            return;
        }

        grid.innerHTML = data.matches.map(m => {
            const userVote = data.userPreds.find(v => v[2] == m[0]);
            const currentPick = userVote ? userVote[3] : null;

            return `
                <div class="match-card glass p-6 animate-fade-in shadow-sm">
                    <div class="flex justify-between text-[10px] font-black mb-4 uppercase text-slate-400">
                        <span>${m[1]} | ${m[2]} IST</span>
                        <span class="text-green-500">● Open</span>
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
    } catch (e) { console.error("Load error", e); }
}

async function handleToggle(btn, matchId, clickedTeam, currentPick) {
    const session = JSON.parse(localStorage.getItem('ipl_session'));
    
    // Toggle Logic: If clicked team is already selected, unselect (set to "")
    const newPick = (clickedTeam === currentPick) ? "" : clickedTeam;

    // UI Feedback
    const buttons = btn.parentElement.querySelectorAll('.team-btn');
    buttons.forEach(b => b.classList.remove('selected'));
    if (newPick !== "") btn.classList.add('selected');

    try {
        await fetch(API, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                action: "vote",
                user: session.username,
                matchId: matchId,
                team: newPick
            })
        });
        // Silent refresh to update the 'currentPick' state for the next click
        setTimeout(loadDashboard, 800); 
    } catch (e) {
        alert("Action failed. Check connection.");
    }
}

function logout() { localStorage.clear(); location.reload(); }