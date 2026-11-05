# Running the Liquid Glass fork

This personal fork adds **Liquid Glass** to Settings → Appearance → Themes and the
command palette's **Change theme** menu. Light, dark, and system appearances work
through the existing theme settings. Select any previous theme to turn it off.

The design targets Apple's June 2025 WWDC reveal, especially
[Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/) and
[the AppKit session](https://developer.apple.com/videos/play/wwdc2025/310/).
The navigation and composer use translucent material and illuminated edges;
conversation text, code, and terminals keep stable backgrounds. Chromium/Electron
adds an SVG backdrop displacement effect. Other browsers retain blur and tint.
This is an approximation, not Apple's native adaptive optical renderer: it does
not sample wallpaper outside the window, dynamically invert labels based on
background luminance, or reproduce native glass merging. Reduced transparency
and increased contrast request solid material; reduced motion disables the
added press scaling. No continuously running animation or DOM capture is used.
The mobile client receives matching colors, not the web refraction effect.

## Run alongside the official app

Install Vite+ using the root README, then run from this checkout:

```sh
vp i
vp run dev --home-dir "$PWD/.t3/liquid-glass"
```

Open the pairing URL printed by the runner and select Liquid Glass. This is an
isolated development instance, with separate state from the installed app.
Do not point it at the installed app's live userdata directory.

For the Electron development shell, use `vp run dev:desktop` with a separate
home directory as described in [Development](development.md). Do not replace
the installed signed app with an unverified custom build.

## Bring in official changes

`origin` is your GitHub fork and `upstream` is `pingdotgg/t3code`. Your customized
branch is `theme/liquid-glass`; `main` remains the unmodified upstream baseline.
With a clean working tree:

```sh
git fetch upstream
git switch theme/liquid-glass
git merge upstream/main
vp i
vp run check:changed upstream/main
git push origin theme/liquid-glass
```

Resolve any merge conflicts before continuing. This merges official source
updates while preserving the theme commits. It is not automatic: upstream UI
or theme architecture changes can require adapting the theme. Do not use a hard
reset or force-sync on the customization branch.

Official binary updates contain only official code, so they cannot preserve a
fork-only theme. For a separately packaged fork, use the existing
`T3CODE_DESKTOP_UPDATE_REPOSITORY` build option to point to your fork's releases,
or `T3CODE_DISABLE_AUTO_UPDATE=true` when launching. A maintained signed release
pipeline is needed for automatic custom-app updates; this change does not set
one up. The official installed app keeps its normal updates.
