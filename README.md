# ממלכת המילים · Word Kingdom

A 2D web game that teaches English from zero to Hebrew-speaking kids (ages 8-12).

## Run

Fully static - no build step, no dependencies, no network calls.

- Locally: open `index.html` in a browser, or serve the folder (`python3 -m http.server`) and open `http://localhost:8000`.
- GitHub Pages: push these files to the repo root and enable Pages on `main` / root. The game will be at `https://yitzhak-el.github.io/<repo>/`.

## Files

- `index.html` - screens shell: menu, level select, 2D world, level-complete, two-player race, dictionary.
- `style.css` - all styling and animations (sky, parallax hills, bubbles, HUD, cards).
- `game.js` - word/sentence data, WebAudio sound effects, speech synthesis, the adventure engine (lane runner), race mode, dictionary, localStorage progress.

## Gameplay

- **Adventure (solo):** a fox runs through the world. Word gates: the English word is spoken aloud, the Hebrew meaning is shown, collect the matching picture bubble. Spelling gates: collect the word's letters in order. Owl gates: complete an English sentence. Missed words come back later (spaced repetition). 3 levels with star ratings.
- **Race (2 players, one screen):** competitive translation race, first to 10, every word spoken on tap.
- **Dictionary:** every collected word, tappable to hear again.

## Notes

- All English audio uses the browser's built-in speech synthesis (`speechSynthesis`, en-US) - works offline-ish, no API keys.
- Sound effects are synthesized with WebAudio - no audio files.
- Progress is stored in `localStorage` under the key `wk`.
- Hebrew UI (`dir=rtl`), English learning content. Mobile (touch/swipe + on-screen buttons) and desktop (arrow keys / W S).
