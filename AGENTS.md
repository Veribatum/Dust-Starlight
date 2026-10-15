# Dust & Starlight development

This is an original single-player 3D frontier space game. Keep the current playable foundation and extend it in focused changes.

## Project structure

- `dist/`: the shipped game, local Three.js modules, optimized GLB models, and MP3 scores. There is no build step or runtime CDN dependency.
- `tests/`: Node.js tests for gameplay, encounters, controls, mobile layout, and assets. Run with `npm test`; no npm installation is required.
- `scripts/`: optional preparation tools for the supplied models and original music.
- `ROADMAP.md`: development priorities.

## Compatibility

Preserve the version-1 save format and accepted legacy missions. Maintain desktop, gamepad, and mobile input. Touch controls must respect safe areas and independent pointer ownership. Surviving ships and wrecks must remain visible after interactions; completed interactions must not grant repeated rewards.

Keep the bundled model and texture resources shared safely across instances. Avoid unnecessary asset downloads or replacing the supplied hulls. Runtime GLBs and MP3s are tracked; raw source uploads are not included.

## Validation and publishing

Run checks appropriate to the change. Gameplay and control changes should pass the existing tests. Check the actual browser/device experience when supported, and report any verification limits honestly.

`.openai/hosting.json` identifies the existing Sites deployment. Preserve that project ID when using the supported Sites publishing workflow. A GitHub commit by itself does not publish a new version to Sites. Keep the repository's visibility and hosting audience as the user has chosen them.

## Production and current gameplay

The user configured GitHub Pages to deploy main at / (root). Push finished changes to GitHub; root index.html opens dist/, with .nojekyll. Routine updates do not need Sites deployment or a new hosting link. Keep the older hosting manifest for provenance.

Preserve the opening cinematic, chapter briefings, actual-hull hangar, illustrated common room, working crew assignments, persistent roster/trust/choices, nine systems, relay repair/interception and registry consequences. Smaller hulls move excess working crew to standby without deleting recruits. Loaded voyages remain port checkpoints.

Use the shell-boundary-safe preparation pipeline and per-asset triangle_budget. Some capital hulls deliberately use up to40k triangles. Never restore the destructive reduction that created cracks.
