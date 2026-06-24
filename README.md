# 🏠 GROUPIES — Interactive Cartoon House

A fully interactive, animated cartoon 3D house world built with Three.js, GSAP, and pure vanilla JavaScript. Deploy directly to GitHub Pages — no backend, no build step.

---

## 🚀 Quick Deploy to GitHub Pages

1. **Fork or clone** this repo
2. Go to **Settings → Pages**
3. Set source to **main branch, root folder**
4. Done! Your site is live at `https://yourusername.github.io/groupies`

---

## 📂 Project Structure

```
groupies/
├── index.html          ← Main HTML entry point
├── style.css           ← All styles (cartoon UI)
├── main.js             ← Three.js scenes, characters, interactions
├── README.md
└── assets/
    ├── faces/          ← 🔴 DROP YOUR FRIEND PHOTOS HERE
    │   ├── sarah.png
    │   ├── power.png
    │   ├── hakim.png
    │   ├── mehdzi.png
    │   ├── dxio.png
    │   └── bahae.png
    └── audio/          ← (optional) custom audio files
```

---

## 🖼️ Adding Real Friend Photos

This is the most important step to personalize the experience!

### Steps:
1. Get a **square photo** of each friend (ideally face-centered)
2. Resize to **128×128px or 256×256px** (any square size works)
3. Name it exactly as shown below
4. Drop it in `assets/faces/`

### Required filenames:
| Character | File | Location |
|-----------|------|----------|
| Sarah | `sarah.png` | Couch (living room) |
| Power | `power.png` | Couch (lying lazily) |
| Hakim | `hakim.png` | Kitchen (eating) |
| Mehdzi | `mehdzi.png` | Kitchen (annoyed) |
| DXIO | `dxio.png` | Floor (playing with cat) |
| Bahae | `bahae.png` | Dance area |

**Supported formats:** `.png` (preferred), `.jpg`, `.svg`

> The app auto-loads images on startup. No code changes needed — just drop the files!

---

## 🎮 Controls

| Action | Input |
|--------|-------|
| Enter house | Click the **door** |
| Exit house | Click **🏠 Exit** button or press `Escape` |
| Talk to characters | **Click** any character |
| Open radio | Click **📻 Radio** or press `R` |
| Camera parallax | **Move mouse** around |
| Enter house (keyboard) | Press `Enter` (when outside) |

---

## 🎵 Radio System

The radio uses the **Web Audio API** — no audio files needed!

Four stations:
- 🎵 **Groupies FM** — chaotic mix vibes  
- 🍳 **Kitchen Radio** — calm beats  
- 🐱 **DXIO Cat Frequency** — playful/glitch  
- 🌙 **Night Mode** — ambient  

To use real MP3s, add them to `assets/audio/` and update the station config in `main.js`.

---

## 💬 Character Dialogues

| Character | Says |
|-----------|------|
| Sarah | *"hiiii ana sara o safi sero thowaw rawr"* |
| Power | *"wa khoti ra makin gha l7wi"* |
| Hakim | *"3afak a mehdzi khlini nzid gha dghma"* |
| Mehdzi | *"wa baraka azobey ra ghadi n3yt lik 3la wadie"* |
| DXIO | *"t7wina bkri"* |
| Bahae | *"waa kanbghi shabeey"* |

To edit dialogues, find the `dialogues` object in `main.js`.

---

## 🛠️ Customization

### Change character colors (body color):
In `main.js`, find `buildInsideScene()` and look for `buildCharacter(scene, 'name', '#COLOR', ...)`. Change the hex color.

### Edit dialogues:
```javascript
const dialogues = {
  sarah: { idle: 'your text here', click: 'your text here' },
  // ...
};
```

### Add more characters:
Use `buildCharacter(scene, 'name', '#color', x, y, z, 'zone')` — it returns `{ mesh, headGroup }`.

---

## 🌐 Tech Stack

- **Three.js r128** — 3D rendering (CDN)
- **GSAP 3.12** — animations (CDN)
- **Web Audio API** — procedural music (browser built-in)
- **Canvas API** — character face textures (browser built-in)
- No npm, no build step, no backend

---

## 🐛 Troubleshooting

**Images not loading?**  
→ Make sure filenames match exactly (lowercase). PNG format recommended.

**Black screen?**  
→ Open browser console (F12). Check for WebGL errors. Most modern browsers support WebGL.

**Low framerate?**  
→ The scene is low-poly by design. Try closing other tabs.

**Audio not working?**  
→ Click anywhere first (browser policy requires user interaction before audio).

---

## 📜 License

MIT — use freely, credit appreciated!

---

*Made with ❤️ for the Groupies squad*
