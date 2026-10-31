# The Dollhouse

A 1 vs 4 asymmetric horror game played inside a moonlit dollhouse. One player is the **Dollmaker**. Four porcelain dolls are trying to wind five music boxes, unlock the front door, and escape before dawn.

You can play either side against AI:

- **The Doll** — wind all five music boxes, mend your sisters, hide in toy chests, and slip out the front door.
- **The Dollmaker** — listen for winding keys, strike twice to down a doll, and strike a third time to shatter her.

Everything is procedural: the house, furniture, dolls, textures, animation, and audio. No external assets or CDNs.

## Play

```bash
./start.sh
```

Open <http://localhost:3002>. Choose a role and difficulty, then enter the dollhouse.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | `WASD` / arrows | Left stick |
| Look | Drag the mouse | Drag the room |
| Interact / wind / hide | Hold `E` | `E` button |
| Ability | `Q` | `Q` button |
| Sprint | `Shift` | `Run` |
| Strike (Dollmaker) | Left click / `Space` | `Strike` |
| Pause | `Esc` or the pause button | Pause button |

## The rules

- Five music boxes are scattered through the Nursery, Kitchen, Workshop, Parlor, and Great Hall.
- A finished box rings through the house and reveals its location to the Dollmaker.
- The Dollmaker breaks a doll in two strikes. A downed doll can be revived by a sister, or shattered by a third strike.
- When all five boxes sing, the front door unlocks. Hold interact at the door to escape.
- The match ends at dawn (seven minutes), when the dolls escape, or when the Dollmaker has shattered enough of them.

## Project layout

- `index.html` / `styles.css` — menus, HUD, touch controls, responsive layout.
- `src/main.js` — renderer, camera, input, screens, boot loop.
- `src/game.js` — match state, objectives, combat, revives, win/loss.
- `src/world.js` — dollhouse geometry, lighting, navigation, collision, minimap.
- `src/props.js` — furniture, music boxes, hiding chests.
- `src/characters.js` — procedural ball-jointed dolls and the Dollmaker.
- `src/ai.js` — A* navigation and survivor/hunter AI.
- `src/audio.js` / `src/textures.js` — synthesized sound and canvas textures.
- `vendor/` — locally vendored Three.js modules.

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://omgithub.com).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://omgithub.com/justagirlinacrazyworld324-lang/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/justagirlinacrazyworld324-lang/PlayGround)

- 🎮 [Open the project](https://omgithub.com/justagirlinacrazyworld324-lang/PlayGround).
- ✨ [Remix this project](https://omgithub.com/?remix=justagirlinacrazyworld324-lang%2FPlayGround).
- 💻 [Explore the source](https://github.com/justagirlinacrazyworld324-lang/PlayGround).
- 🛠️ [Check build runs](https://github.com/justagirlinacrazyworld324-lang/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/justagirlinacrazyworld324-lang/PlayGround/issues).
- 👤 [Explore the creator's projects](https://omgithub.com/justagirlinacrazyworld324-lang).
- 🌍 [Create with OMGithub](https://omgithub.com).
<!-- omgithub:readme:end -->
