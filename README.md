# peterbrown.space

A collection of puzzle games and generative art tools, built for personal use, mostly vibe-coded.
Live at **[peterbrown.space](https://peterbrown.space)**

---

## Projects

### Sudoku

A Sudoku player tuned to personal playing preferences.

- Candidate highlighting, auto-candidate mode, undo/redo, pause timer, conflict detection
- Game history with timestamps and completion state (persisted in localStorage)
- Puzzle import/export in standard 81-digit format
- Background puzzle pre-generation so the next puzzle is always ready

### evolveSVG

A generative SVG art tool built around artificial selection. A 3×3 grid displays pattern variations; select one to make it the parent, then evolve the next generation from it. This is really great with coming up with your own background images.

- Export super high quality patterns as SVG or PNG.
- Mutation system with tunable parameters: mutation count, parameter range, structural change rate, max layers
- Shape types: circles, ellipses, rects, polygons, paths, and tiling patterns (dots, stripes, crosshatch, hexgrid, waves, zigzag)
- Blend modes: normal, multiply, screen, overlay, color-dodge, difference, hard-light
- SVG filter effects: feTurbulence displacement, blur, color shift, masking, morphology, diffuse lighting, channel curves, convolution
- Expandable view with zoom/pan and LOD rendering.
- Bookmarking, SVG/PNG export, copy to clipboard.
- Layer panel for reordering and managing individual layers.

### KenKen

A math-based cage puzzle game with configurable grid sizes from 4×4 to 8×8. It's kinda like sudoku in some ways. This is a minor project of mine.

---

## License

MIT — see [LICENSE](LICENSE)
