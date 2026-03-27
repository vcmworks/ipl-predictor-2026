# 🏏 IPL 2026 Predictor

A complete web-based prediction game where users can predict IPL match winners, earn points, and compete on a live leaderboard. Admins have full control to open/close voting and declare winners, with automatic points calculation.

## ✨ Features

### For Users
- 🔐 Secure login with individual accounts
- 🎯 Predict match winners with one click
- 📊 Live leaderboard with ranking medals (🥇🥈🥉)
- 📝 View prediction history and results
- 📱 Fully responsive mobile-friendly design

### For Admins
- 🎮 Dedicated admin panel
- 🔓 Toggle voting open/closed for any match
- 🏆 Declare winners and award points instantly
- 👁️ View all user predictions per match
- 🔒 Admin PIN protection (admin123)

### Automatic Points System
| Action | Points |
|--------|--------|
| ✅ Correct prediction | +10 points |
| ❌ Wrong prediction | 0 points |
| 📝 Didn't vote | +5 points |

## 🚀 Quick Start

### Prerequisites
- Google Account (for Google Sheets)
- Web browser (Chrome, Firefox, Safari, Edge)
- Internet connection

### Step 1: Create Google Sheets

1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a new spreadsheet and name it "IPL 2026 Predictor"
3. Create three sheets (tabs) with these exact names:

#### Sheet 1: "Matches"
| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| ID | Date | Time | Team1 | Team2 | Venue | Vote | Winner |

**Sample Data:**