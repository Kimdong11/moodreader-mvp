# MoodReader QA Checklist

## 1. Installation & Setup
- [ ] Extension installs successfully from `dist` folder.
- [ ] Server starts on port 8080 (`npm start`).
- [ ] No immediate errors in Background console.

## 2. Consent Flow
- [ ] Navigate to a new article page (e.g. Wiki).
- [ ] Scroll down. Control Bar should appear.
- [ ] "Analyze" triggers Consent Modal.
- [ ] "Cancel" closes modal and does nothing.
- [ ] "Enable" closes modal and starts analysis (Check Console "Analyze Request").

## 3. Player Lifecycle
- [ ] After analysis, Player Tab opens automatically.
- [ ] YouTube Player loads a video (Paused state).
- [ ] Click Play on Control Bar -> Music starts.
- [ ] Click Stop on Control Bar -> Music pauses.
- [ ] Click Next -> Loads next track and auto-plays.

## 4. Policies
- [ ] **Daily Limit**: Run analysis 20 times. 21st time should log warning and use local fallback.
- [ ] **Auto-Stop**: Leave idle for 15 mins. Player should stop (check console for "Auto-stopping").
- [ ] **De-dup**: Next/Search shouldn't repeat exact track ID within 30 mins.

## 5. Reporting
- [ ] Play music for > 10 seconds. Stop.
- [ ] Open Popup.
- [ ] Check "Weekly Activity". Minutes should increase.
