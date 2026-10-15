# Development priorities

The imported baseline is the playable October 14, 2026 version of Dust & Starlight, including the mobile cockpit and the fix that keeps completed ships and wrecks visible. Its Sites source commit is `31f93b793b70fc9a205f0bb15612bf398032f8f7`.

New Game, Continue, Load Game, three manual slots, Previous voyage backup, and main-menu return are implemented after the baseline. Loaded slots are port checkpoints; the original autosave format remains supported. See [ASSESSMENT.md](ASSESSMENT.md) for the current source-based assessment and the proposed next playable milestone.

## Flight and combat

Refine steering response and camera motion on desktop and phones. Improve weapon impacts, target feedback, and enemy tactics. Keep keyboard, mouse, gamepad, and independent touch controls working together.

## A living universe

Give commercial traffic more convincing routes, departure behavior, radio exchanges, and faction encounters. Make systems rewarding to explore between contracts.

## Missions

Expand the existing rescue, escort, survey, covert handoff, and carrier defense jobs with optional objectives, complications, and choices that affect reputation. Preserve accepted contracts and existing saves.

## Progression

Make ship upgrades and crew abilities visibly change how the ship performs. Build on the six existing hulls and imported ship assets.

## Validation

Keep the existing gameplay, input, layout, and model tests passing. Actual browser and iPhone playtesting is still needed for control feel, visual polish, and performance; the automated checks do not establish those qualities.
