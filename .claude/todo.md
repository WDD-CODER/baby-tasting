# Active Tasks

### Plan 020 — The app loads and answers fast: small icon font, compressed and cached files, fewer database trips

- [ ] S1: Compress everything the server sends so scripts and data travel at a third of their size
- [ ] S2: Let the browser keep built files for a year and always re-check the page itself
- [ ] S3: Remember a valid session for a minute instead of asking the database on every request
- [ ] S4: Check the built-in food catalog once per household instead of on every Tasting request
- [ ] S5: Give the home screen its events and the running sleep in one answer
- [ ] S6: Give the statistics page all six sections from one read of the events
- [ ] C1: Refresh the home data every 15 seconds and once when the parent returns, while clocks keep ticking every 5
- [ ] C2: Load the statistics page with one request instead of six
- [ ] C3: Build a small icon font that holds only the icons the app shows by default
- [ ] C4: Show icons from the small font and fetch the full font only when it is needed
- [ ] C5: Keep the full list of icon names out of the first script
- [ ] C6: Shrink the two app icons to their real size so the phone does not download two megabytes for them
- [ ] C7: Fail the checks when the app grows heavy again or an icon is missing from the small font
