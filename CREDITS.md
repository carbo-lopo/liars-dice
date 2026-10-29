# Credits

## Music

**"Vibing Over Venus"** Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

The same credit is shown under the Music switch on the game's Options screen.

## Sound effects

| File in `web/src/assets/sounds/` | Original | Source | Licence |
|---|---|---|---|
| `click.mp3` | `click5.ogg` | [UI Audio](https://kenney.nl/assets/ui-audio) by Kenney | CC0 1.0 |
| `click-strong.mp3` | `click1.ogg` | [UI Audio](https://kenney.nl/assets/ui-audio) by Kenney | CC0 1.0 |
| `counted.mp3` | `toggle_002.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) by Kenney | CC0 1.0 |
| `dice-shake-1.mp3`, `dice-shake-2.mp3`, `dice-shake-3.mp3` | `dice-shake-1.ogg` to `dice-shake-3.ogg` | [Casino Audio](https://kenney.nl/assets/casino-audio) by Kenney | CC0 1.0 |
| `die-land.mp3` | `dice-throw-1.ogg` | [Casino Audio](https://kenney.nl/assets/casino-audio) by Kenney | CC0 1.0 |
| `stamp.mp3` | `traditional-stamp` (44189) | freesound_community on [Pixabay](https://pixabay.com/) | [Pixabay Content License](https://pixabay.com/service/license-summary/) |

Kenney's assets are public domain (CC0); credit isn't required but is given
here. The Pixabay Content License doesn't require credit either.

## Preparing the sounds

The files above were made from the originals with `tools/process-sounds.sh`
(requires ffmpeg), which trims leading silence, sets each effect's loudness
for its role, limits peaks, encodes MP3, and fades the music's ends so it
loops smoothly. The originals are kept outside the repository. To change a
sound's level, edit its target in the script and run it again:

```
tools/process-sounds.sh <folder with the originals> web/src/assets/sounds
```

The script expects the original file names listed above, with the stamp
renamed to `stamp.mp3` and the music to `vibing-over-venus.mp3`.
