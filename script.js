const API = "https://script.google.com/macros/s/AKfycbzm7dl-JgqCLI6YCsisyhwbqxmAcLDYBC1Lfn4Dk6h7HmFRjWWYzQQcJ7hL4SWu-h0nFQ/exec";

// 1. PAGE LOAD
window.onload = () => {
    const session = JSON.parse(localStorage.getItem('ipl_session'));
    if (session) {
        document.getElementById('loginOverlay').classList.add('hidden');
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
        alert("Server unreachable. Check script deployment.");
    }
}

// 3. DASHBOARD (Next 6 Future Matches)
async function loadDashboard() {
    const session = JSON.parse(localStorage.getItem('ipl_session'));
    const grid = document.getElementById('matchGrid');
    if (!grid) return;

    try {
        const res = await fetch(`${API}?action=getDashboard&user=${session.username}`);
        const data = await res.json();
        const now = new Date();

        // Process data and filter for FUTURE matches only
        const upcoming = data.matches.slice(1)
            .map(m => {
                const dateParts = m[1].split('/'); // Expects DD/MM/YYYY
                const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                const istMatchTime = new Date(`${formattedDate}T${m[2]}:00+05:30`);
                return { raw: m, startTime: istMatchTime };
            })
            .filter(item => item.startTime > now) // Only show if match hasn't started
            .sort((a, b) => a.startTime - b.startTime)
            .slice(0, 6); // Limit to 6

        if (upcoming.length === 0) {
            grid.innerHTML = `<div class="col-span-full glass p-10 text-center text-slate-500 font-bold uppercase">No matches open for prediction.</div>`;
            return;
        }

        grid.innerHTML = upcoming.map(item => {
            const m = item.raw;
            const istTime = item.startTime;
            
            const deTime = istTime.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
            const deDate = istTime.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit' });

            const userVote = data.userPreds.find(v => v[2] == m[0]);
            const pick = userVote ? userVote[3] : null;

            return `
                <div class="match-card glass p-6 animate-fade-in shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex justify-between text-[10px] font-black mb-4 uppercase tracking-widest text-slate-400">
                        <span>${deDate} | ${deTime} (DE TIME)</span>
                        <span class="text-green-500">● Open</span>
                    </div>
                    <div class="flex gap-3 mb-4">
                        <button onclick="handleToggle(event, ${m[0]}, '${m[3]}', '${pick}', '${istTime.toISOString()}')" 
                            class="team-btn ${pick === m[3] ? 'selected' : ''}">
                            ${m[3]}
                        </button>
                        <button onclick="handleToggle(event, ${m[0]}, '${m[4]}', '${pick}', '${istTime.toISOString()}')" 
                            class="team-btn ${pick === m[4] ? 'selected' : ''}">
                            ${m[4]}
                        </button>
                    </div>
                    <div class="text-center pt-3 border-t border-slate-100 flex justify-between items-center">
                        <span class="text-[9px] text-slate-400 font-bold uppercase italic">Match #${m[0]}</span>
                        <span class="text-[9px] text-slate-400 font-bold uppercase italic">IST: ${m[2]}</span>
                    </div>
                </div>`;
        }).join('');
    } catch (e) {
        console.error("Dashboard Error:", e);
        grid.innerHTML = `<p class="col-span-full text-center text-red-500">Failed to load matches. Please try again.</p>`;
    }
}

// 4. PREDICTION LOGIC
async function handleToggle(event, matchId, clickedTeam, currentPick, isoTime) {
    const now = new Date();
    const matchTime = new Date(isoTime);

    if (now >= matchTime) {
        alert("🔒 Match has already started! Entry locked.");
        return loadDashboard();
    }

    const session = JSON.parse(localStorage.getItem('ipl_session'));
    const btn = event.currentTarget;
    let actionTeam = (clickedTeam === currentPick) ? "" : clickedTeam;

    // Local UI Update for speed
    const parent = btn.parentElement;
    parent.querySelectorAll('.team-btn').forEach(b => b.classList.remove('selected'));
    if (actionTeam !== "") btn.classList.add('selected');
    btn.style.opacity = "0.5";

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
        // Silent refresh
        loadDashboard();
    } catch (e) {
        alert("Save failed. Check connection.");
        loadDashboard();
    }
}

// 5. LOGOUT
function logout() {
    localStorage.clear();
    location.reload();
}
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
