// ==================== CONFIGURATION ====================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyfH9j4Px9U87gen3nIHQcPZ24maS-HEIGa3NVu58bAaadnGgmnfBeTgHaIJaXCKn4b/exec";

let user = null;
let autoRefresh = null;

// ==================== API CALLS ====================
async function callAPI(params) {
    try {
        const url = new URL(SCRIPT_URL);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        url.searchParams.append('t', Date.now());
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

// ==================== DATE FORMATTING ====================
function formatDate(dateStr, timeStr) {
    if (!dateStr) return "Date TBA";
    try {
        let dateVal = dateStr;
        if (typeof dateStr === 'string' && dateStr.includes('T')) {
            const d = new Date(dateStr);
            dateVal = `${d.getDate().toString().padStart(2, '0')}-${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}-${d.getFullYear().toString().slice(-2)}`;
        }
        const parts = dateVal.split('-');
        const day = parts[0];
        const monthMap = { 'Jan': 'Jan', 'Feb': 'Feb', 'Mar': 'Mar', 'Apr': 'Apr', 'May': 'May', 'Jun': 'Jun',
                          'Jul': 'Jul', 'Aug': 'Aug', 'Sep': 'Sep', 'Oct': 'Oct', 'Nov': 'Nov', 'Dec': 'Dec' };
        const month = monthMap[parts[1]] || parts[1];
        let year = parts[2];
        if (year && year.length === 2) year = '20' + year;
        return `${day} ${month} ${year} · ${timeStr || 'TBD'}`;
    } catch (e) {
        return dateStr;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== LOGIN ====================
async function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.querySelector('#login-screen button');
    const originalText = btn.innerHTML;
    
    if (!username || !password) {
        alert("Please enter username and password");
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '⏳ Loading...';
    
    try {
        const data = await callAPI({ action: 'login', username, password });
        
        if (data.success) {
            user = { username, name: data.name };
            document.getElementById('display-name').innerText = user.name;
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            
            // Show admin buttons if admin
            if (username === 'admin') {
                const adminButtons = document.getElementById('admin-buttons');
                if (adminButtons) adminButtons.style.display = 'block';
            }
            
            await loadData();
            if (autoRefresh) clearInterval(autoRefresh);
            autoRefresh = setInterval(loadData, 30000);
        } else {
            alert("Login failed: " + data.error);
        }
    } catch (err) {
        alert("Connection error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ==================== LOAD DATA ====================
async function loadData() {
    if (!user) return;
    
    try {
        const data = await callAPI({ action: 'getData' });
        
        // Update leaderboard
        const users = data.users || [];
        users.sort((a, b) => (b.Points || 0) - (a.Points || 0));
        const tbody = document.querySelector('#lb-table tbody');
        tbody.innerHTML = users.map((u, i) => {
            const rank = i + 1;
            let medal = '';
            if (rank === 1) medal = '🥇 ';
            else if (rank === 2) medal = '🥈 ';
            else if (rank === 3) medal = '🥉 ';
            let rankClass = '';
            if (rank === 1) rankClass = 'rank-1';
            else if (rank === 2) rankClass = 'rank-2';
            else if (rank === 3) rankClass = 'rank-3';
            return `
                <tr class="${rankClass}">
                    <td>${medal}${rank}</td>
                    <td><strong>${escapeHtml(u.Name)}</strong></td>
                    <td class="pts-number">${u.Points || 0}</td>
                </tr>
            `;
        }).join('');
        
        // Get matches
        const matches = data.matches || [];
        const predictions = data.predictions || [];
        
        // Available matches (VoteOpen = YES, no winner)
        const availableMatches = matches.filter(match => {
            return match.VoteOpen === true && (!match.Winner || match.Winner === '');
        });
        
        // Completed matches (has winner)
        const completedMatches = matches.filter(match => {
            return match.Winner && match.Winner !== '';
        });
        
        // Render available matches
        const matchesContainer = document.getElementById('matches-container');
        if (availableMatches.length === 0) {
            matchesContainer.innerHTML = `
                <div class="card" style="text-align: center;">
                    <p>🏏 No matches available for voting right now.</p>
                    <p style="font-size: 0.85rem; margin-top: 10px;">Admin will open matches by setting Vote = YES in Google Sheets</p>
                </div>
            `;
        } else {
            matchesContainer.innerHTML = availableMatches.map(match => {
                const userPred = predictions.find(p => p.Username === user.username && String(p.MatchID) === String(match.ID));
                const formattedDate = formatDate(match.Date, match.Time);
                
                if (userPred) {
                    return `
                        <div class="card">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong style="font-size: 1.1rem;">${escapeHtml(match.Team1)} 🆚 ${escapeHtml(match.Team2)}</strong>
                                <span class="status-open">OPEN</span>
                            </div>
                            <div class="match-date">📅 ${escapeHtml(formattedDate)}</div>
                            <div class="match-venue">🏟️ ${escapeHtml(match.Venue)}</div>
                            <div class="prediction-badge">
                                🎯 Your prediction: <strong>${escapeHtml(userPred.Prediction)}</strong>
                            </div>
                        </div>
                    `;
                }
                
                return `
                    <div class="card">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong style="font-size: 1.1rem;">${escapeHtml(match.Team1)} vs ${escapeHtml(match.Team2)}</strong>
                            <span class="status-open">OPEN</span>
                        </div>
                        <div class="match-date">📅 ${escapeHtml(formattedDate)}</div>
                        <div class="match-venue">🏟️ ${escapeHtml(match.Venue)}</div>
                        <div class="vote-btns">
                            <button class="vote-btn" data-id="${match.ID}" data-team="${escapeHtml(match.Team1)}">🏏 ${escapeHtml(match.Team1)}</button>
                            <button class="vote-btn" data-id="${match.ID}" data-team="${escapeHtml(match.Team2)}">⚡ ${escapeHtml(match.Team2)}</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Render completed matches
        const completedContainer = document.getElementById('completed-container');
        if (completedMatches.length === 0) {
            completedContainer.innerHTML = `
                <div class="card" style="text-align: center;">
                    <p>🏆 No completed matches yet.</p>
                </div>
            `;
        } else {
            completedContainer.innerHTML = completedMatches.map(match => {
                const userPred = predictions.find(p => p.Username === user.username && String(p.MatchID) === String(match.ID));
                const formattedDate = formatDate(match.Date, match.Time);
                
                let predictionHtml = '';
                if (userPred) {
                    const isCorrect = userPred.Prediction === match.Winner;
                    predictionHtml = `
                        <div class="${isCorrect ? 'prediction-badge' : 'completed-badge'}" style="${isCorrect ? '' : 'background: rgba(231, 76, 60, 0.2); border-color: #e74c3c; color: #e74c3c;'}">
                            🎯 You predicted: ${escapeHtml(userPred.Prediction)} ${isCorrect ? '✓ Correct! (+10 points)' : '✗ Wrong (0 points)'}
                        </div>
                    `;
                } else {
                    predictionHtml = `<div class="completed-badge">📝 You did not vote for this match (+5 points awarded)</div>`;
                }
                
                return `
                    <div class="card">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong style="font-size: 1.1rem;">${escapeHtml(match.Team1)} vs ${escapeHtml(match.Team2)}</strong>
                            <span class="status-open" style="background: #ffd966; color: #8b5a2b;">COMPLETED</span>
                        </div>
                        <div class="match-date">📅 ${escapeHtml(formattedDate)}</div>
                        <div class="match-venue">🏟️ ${escapeHtml(match.Venue)}</div>
                        <div class="winner-badge">
                            🏆 Winner: <strong>${escapeHtml(match.Winner)}</strong>
                        </div>
                        ${predictionHtml}
                    </div>
                `;
            }).join('');
        }
        
        // Attach vote handlers
        document.querySelectorAll('.vote-btn').forEach(btn => {
            btn.onclick = () => handleVote(btn.dataset.id, btn.dataset.team, btn);
        });
        
    } catch (error) {
        console.error("Load data error:", error);
        document.getElementById('matches-container').innerHTML = '<div class="card">Error loading data</div>';
    }
}

// ==================== VOTE ====================
async function handleVote(matchId, team, button) {
    if (!confirm(`Predict "${team}" to win?`)) return;
    
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '⏳ Saving...';
    
    try {
        const result = await callAPI({
            action: 'vote',
            username: user.username,
            matchId: matchId,
            prediction: team
        });
        
        if (result.success) {
            alert(`✅ Prediction saved! You picked ${team}.`);
            await loadData();
        } else {
            alert(result.message || "Could not save prediction");
            button.disabled = false;
            button.innerHTML = originalText;
        }
    } catch (err) {
        alert("Error: " + err.message);
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// ==================== ADMIN FUNCTIONS ====================
async function recalculateAllPoints() {
    if (!confirm("This will recalculate ALL points based on all winners. Continue?")) return;
    
    try {
        const result = await callAPI({ action: 'recalculate' });
        if (result.success) {
            alert(`✅ ${result.message}`);
            await loadData();
        } else {
            alert("Error: " + result.message);
        }
    } catch (err) {
        alert("Error: " + err.message);
    }
}

async function resetAllPoints() {
    if (!confirm("⚠️ This will reset ALL points to ZERO for all users. Are you sure?")) return;
    
    try {
        const result = await callAPI({ action: 'resetPoints' });
        if (result.success) {
            alert(`✅ ${result.message}`);
            await loadData();
        } else {
            alert("Error: " + result.message);
        }
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ==================== INIT ====================
window.handleLogin = handleLogin;
window.recalculateAllPoints = recalculateAllPoints;
window.resetAllPoints = resetAllPoints;

console.log("IPL 2026 Predictor Ready");