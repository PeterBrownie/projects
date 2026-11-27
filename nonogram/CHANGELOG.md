# Nonogram changelog

Changes to the nonogram at `peterbrown.space/nonogram`, newest first. Each entry is one
change a player would notice. The "Unreleased" section collects changes that aren't committed yet.

## Unreleased

## 2026-11-27

- Switching between square and cross mode plays a sound for the mode it lands on (the switch or
  Space). A new board resetting to square mode and the page load stay quiet.
- Fill tones ladder back down the 15-note scale after the top, then climb again.
- The fill tone files were renamed (`fill-*` to `scale-*`), so browsers holding the old six-tone
  files fetch the new scale.
- Fill tones climb a new 15-note scale, one note per square.
- Major grid lines run through filled squares in a darker shade of the theme color.
- Every new game starts in square mode instead of keeping the last mode.
- New game-lost sound.
- Long drags arpeggiate back down the fill tones instead of repeating the top note.
- Narrow windows fold the board settings and the page options into drawers.
- Time and lives sit above the column caps.
- Row caps size to their content and ease between boards.
- Caps tuck under the grid's rounded corners.

## 2026-11-26

- New game-lost sound. The old one became the mistake sound.
- Solving the board cuts off a line chime that is still ringing, so the solve sound plays in its place.
- Sound effects: rising fill tones while dragging, a tap for crosses, and line, solve, mistake and
  lost sounds. A mute button (M).
- The solved picture keeps the accent color, and the solved ground fades to the gutter color.
- Pressing a new-board button cancels a result card that is about to open. Near-miss clicks on the
  covered button still count, and a card that has just opened snaps shut.
- Crosses from a completed line appear as the wave reaches them.
- A run count shows while dragging over filled squares.
- Crossed squares fill in with the gutter color.
- Softer dark-mode accents.
- No double-tap zoom on Safari.
- Smoother animations on Safari and mobile.
- A continuous drag sweep with inner corners, a soft wave along completed lines, and a
  1.5s delay before the result card.
- Clue numbers fade once their block is settled and joined to a line end.
- Board size and difficulty are separate choices, and boards are clumpier.
- The board size stays steady when a game ends.
- Custom color picker.
- History of solved boards.
- Fill reveal animations and an accent color that fades between themes.
- The mode switch has cross on the left, and a tap anywhere on it toggles.
- Inline SVG fills, which fix a flash in Firefox.
- Shorter column caps.
- Rounded tiles whose fills merge with their neighbors, and a color wave on completed lines.
- Space switches mode.
- A cross placed by a mistake keeps a red X.
- First release: random boards that can always be solved line by line, three lives, drag to mark
  lines, light and dark mode, and color themes.
