# Nonogram changelog

Changes to the nonogram at `peterbrown.space/nonogram`, newest first. Each entry is one
change a player would notice, grouped under the time it was pushed live (US Central). The
"Unreleased" section collects changes that haven't been pushed yet.

## Unreleased

## 2026-11-27

### 22:23

- Painting previews in the gallery have square corners, and the cards no longer list section
  counts, sizes or colors found; the progress bar stays.
- On a painting, every section shows the board's tiles, each in its pixel's color so far, or
  empty with no colors found yet. They fade in as the painting grows out of its card, and a
  chosen section lands tile for tile on its board.
- Section lines on a painting are much thinner.
- A painting has a dark frame all the way around its edge.
- Opening a painting fades the rest of the gallery out instead of dropping it at once, and picking
  a section fades out the other sections the same way.
- Restart painting fades in with the rest of the page.
- The hover outline on a section sits above its tiles.
- Random boards moved to the header on the paintings pages, in place of the size and difficulty
  choices.
- Removed the gallery's subtitle and the sections-done count above a painting.

### 22:00

- Paintings: eight special puzzles made from pixel-art paintings, opened with the new
  Paintings button. Each painting is cut into sections, many of them not square, and each section
  is three boards: its red, green, then blue channel in two tones. Solving one fades the board into
  that channel's true colors, mixed with the ones found before, until the section is in full color.
  Running out of lives locks that section for 20 minutes. Progress is saved in the browser.
- The title hides on windows narrower than 420px so the header stays on one row.
- Paintings move smoothly between pages: a painting's picture grows out of its gallery card, a
  chosen section grows onto its board's squares while the clues, time and lives fade in, and both
  shrink back when you leave. Nothing pops in or out, and the page no longer shows scrollbars
  partway through.
- Playable painting sections brighten a little under the pointer.
- A lost painting board no longer shows the squares you missed.
- A finished board (solved or lost) no longer highlights rows, columns or clues under the pointer.
- A finished painting becomes one picture: its section lines shrink until they're gone.
- Restart painting, under each painting, clears its colors (after asking) so it can be played
  again. A section that is still locked stays locked.
- The run length shown while dragging now also appears once the run you're filling grows past 5
  squares, then counts up as before.

### 20:56

- Major grid lines through the picture fade away when the board is solved, along with the
  rest of the grid lines.

### 18:41

- Temporary: click the hearts to give yourself a life, as many times as you like.

### 18:05

- Smoother animation late in a game on phones, when most squares are marked and every fill
  completes lines.
- Crosses no longer flash black in Chrome when their line completes.

### 17:49

- Major grid lines run unbroken through the inner corners of filled shapes.

### 17:36

- New sounds for switching to square mode and to cross mode.

### 17:17

- Switching between square and cross mode plays a sound for the mode it lands on (the switch or
  Space). A new board resetting to square mode and the page load stay quiet.

### 16:09

- Fill tones ladder back down the 15-note scale after the top, then climb again.
- The fill tone files were renamed (`fill-*` to `scale-*`), so browsers holding the old six-tone
  files fetch the new scale.

### 16:06

- Fill tones climb a new 15-note scale, one note per square.
- Major grid lines run through filled squares in a darker shade of the theme color.

### 15:31

- Every new game starts in square mode instead of keeping the last mode.

### 14:58

- New game-lost sound.

### 09:48

- Long drags arpeggiate back down the fill tones instead of repeating the top note.

### 09:43

- Narrow windows fold the board settings and the page options into drawers.
- Time and lives sit above the column caps.
- Row caps size to their content and ease between boards.
- Caps tuck under the grid's rounded corners.

## 2026-11-26

### 22:29

- New game-lost sound. The old one became the mistake sound.

### 22:15

- Solving the board cuts off a line chime that is still ringing, so the solve sound plays in its place.

### 22:02

- Sound effects: rising fill tones while dragging, a tap for crosses, and line, solve, mistake and
  lost sounds. A mute button (M).

### 17:02

- The solved picture keeps the accent color.

### 17:01

- The solved ground fades to the gutter color.

### 16:54

- Near-miss clicks on a new-board button covered by the result card still count, and a card that
  has just opened snaps shut.

### 16:49

- Starting a new board before the result card opens cancels it.

### 16:42

- Crosses from a completed line appear as the wave reaches them.
- A run count shows while dragging over filled squares.

### 16:28

- Crossed squares fill in with the gutter color.
- Softer dark-mode accents.
- No double-tap zoom on Safari.

### 16:17

- Smoother animations on Safari and mobile.

### 16:02

- A continuous drag sweep with inner corners, a soft wave along completed lines, and a 1.5s delay
  before the result card.
- Clue numbers fade once their block is settled and joined to a line end.

### 15:51

- Board size and difficulty are separate choices, and boards are clumpier.

### 15:34

- The board size stays steady when a game ends.

### 15:30

- Custom color picker.
- History of solved boards.
- Clue numbers fade one at a time instead of the whole clue at once.

### 15:21

- Fill reveal animations and an accent color that fades between themes.
- The mode switch has cross on the left.

### 15:11

- Inline SVG fills, which fix a flash in Firefox.
- Shorter column caps.
- A tap anywhere on the mode switch toggles it.

### 15:05

- Rounded tiles whose fills merge with their neighbors, and a color wave on completed lines.
- Space switches mode.

### 14:39

- A cross placed by a mistake keeps a red X.

### 14:38

- Polish to the caps, grid lines, drag turns and line wave.

### 14:27

- Fix for the mistake highlight.

### 14:23

- First release: random boards that can always be solved line by line, three lives, drag to mark
  lines, light and dark mode, and color themes.
