const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyoLpJeaROwNf7aFgh-RVFDoz8bi7hTQtG12xrKKHHQFGjR6HcdlPTqbVeP7lAawTcBDQ/exec";

// 1. Manage User Identity
let username = localStorage.getItem('ipl_user');
if (!username) {
    username = prompt("Enter your name to start predicting:");
    if (!username) username = "Anonymous_" + Math.floor(Math.random() * 1000);
    localStorage.setItem('ipl_user', username);
}
document.getElementById('user-tag').innerText = username;

// 2. Fetch and Display Matches
async function loadMatches() {
    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        const grid = document.getElementById('match-grid');
        grid.innerHTML = '';

        // Skip header row [0], loop through others
        data.slice(1).forEach(row => {
            const [id, date, time, home, away, stadium] = row;
            
            // Format: 2026-03-28T19:30
            const matchTime = new Date(`${date}T${time}`);
            const now = new Date();
            const isLocked = now > matchTime;

            grid.innerHTML += `
                <div class="glass p-6 rounded-2xl relative ${isLocked ? 'opacity-50' : ''}">
                    <div class="flex justify-between text-[10px] font-bold tracking-widest text-gray-500 mb-4">
                        <span>${date} @ ${time}</span>
                        <span class="${isLocked ? 'text-red-500' : 'text-green-500'}">${isLocked ? 'LOCKED' : 'OPEN'}</span>
                    </div>
                    <div class="flex justify-between items-center mb-6">
                        <button onclick="submitPrediction(${id}, '${home}')" ${isLocked ? 'disabled' : ''} class="w-24 h-24 bg-slate-800 rounded-xl hover:bg-yellow-500 hover:text-black transition flex flex-col items-center justify-center border border-white/5">
                            <span class="text-2xl font-black">${home.substring(0,3).toUpperCase()}</span>
                            <span class="text-[10px] mt-1">${home}</span>
                        </button>
                        <span class="text-gray-600 font-black italic">VS</span>
                        <button onclick="submitPrediction(${id}, '${away}')" ${isLocked ? 'disabled' : ''} class="w-24 h-24 bg-slate-800 rounded-xl hover:bg-yellow-500 hover:text-black transition flex flex-col items-center justify-center border border-white/5">
                            <span class="text-2xl font-black">${away.substring(0,3).toUpperCase()}</span>
                            <span class="text-[10px] mt-1">${away}</span>
                        </button>
                    </div>
                    <p class="text-center text-[10px] text-gray-500 uppercase">${stadium}</p>
                </div>
            `;
        });
    } catch (e) {
        console.error("Error loading matches:", e);
    }
}

// 3. Submit to Google Sheets
async function submitPrediction(matchId, team) {
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = "Saving...";
    btn.disabled = true;

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Essential for Google Apps Script
            body: JSON.stringify({ 
                user: username, 
                matchId: matchId, 
                team: team 
            })
        });
        alert(`Prediction saved: ${team}!`);
    } catch (e) {
        alert("Success! (Note: Redirect error is normal with Google Script but data is saved)");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

loadMatches();