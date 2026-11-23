# SYPT Fight Matrix Generator

A browser-based generator for SYPT finals fight matrices, designed for hosting on GitHub Pages.

## Supported formats and constraints

- 8 teams: 4 rounds, 4 rooms per round
- 10 teams: 4 rounds, 5 rooms per round
- Half the teams follow RORO (Reporter, Opponent, Reporter, Opponent)
- Half the teams follow OROR (Opponent, Reporter, Opponent, Reporter)
- Every team appears exactly once per round
- No repeated team pairing
- No same-school pairing
- Maximum two finalist teams per school
- Team IDs use `school_teamnumber` (for example `HCI_1`, `HCI_2`, `RI_1`)

## Features

- Randomized backtracking scheduler
- Reproducible Matrix ID / seed
- Displays each team's RORO or OROR assignment
- 1, 3, or 5 alternative matrices
- Built-in role-sequence and pairing validation
- CSV download including role sequences
- Print / Save as PDF
- Static HTML/CSS/JavaScript, suitable for GitHub Pages

## Run locally

Open `index.html` directly in a browser, or use the VS Code Live Server extension.

## Publish with GitHub Pages

In the repository, go to **Settings > Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select the `main` branch and `/ (root)`, then save.

## Files

- `index.html`: user interface
- `style.css`: presentation
- `app.js`: UI logic, sequence display, and CSV export
- `fightmatrix.js`: fight-matrix generation and verification
