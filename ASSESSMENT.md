# Dust & Starlight: next improvements

This assessment is based on the current source and automated gameplay checks, plus the player's feedback in this conversation. It does not claim a new browser playtest or measured device performance.

The foundation now includes six systems, distinct stations, imported ships, commercial traffic, music, five encounter types, trading and upgrades, a six-chapter campaign, and desktop/touch/gamepad controls. The new title screen and save slots make the opening chapters easy to replay while preserving a longer voyage.

## Priorities

| Priority | Current evidence | Next change | Intended result |
| --- | --- | --- | --- |
| 1. Flight and combat | Pirate and patrol AI share the same orbit/approach/shoot routine in `dist/flight.js`. Hull speed, agility, cargo and protection vary, but cannon damage comes from the same upgrade formula in `dist/world.js`. | Give raiders distinct attack roles, improve impact and threat feedback, and tune turning/camera response on real desktop and phone hardware. | Ordinary flying and dogfighting stay interesting between objectives. |
| 2. Exploration and spontaneous events | `Flight.buildWorld()` creates a station, traffic, ore, salvage and enemies. Most structured events are created by accepted contracts in `dist/encounters.js`. | Add memorable local landmarks, optional distress calls, suspicious signals and encounters that can be discovered without visiting the job board. | Each system offers a reason to explore and a story the player chose to pursue. |
| 3. Mission variation | Rescue, escort, survey, covert handoff and defense already differ. Local jobs reuse the same layouts and interaction durations, with limited choices. | Add alternate routes, optional objectives and complications with clear consequences: abandon a payday to answer a distress call, take a dangerous shortcut, or choose who receives recovered evidence. | Repeating a job type produces a different situation, rather than only another payout. |
| 4. Ship and crew identity | Current ship classes change numeric handling/cargo stats, and crew bonuses mainly modify economy or maintenance. Reputation is one number with a small unlock threshold. | Add utility equipment and tradeoffs for each hull, crew interactions during jobs, and faction-specific reputation. | Ship and crew choices shape the captain's style and future work. |
| 5. Exact encounter checkpoints | The new save slots preserve world/contract progress and load safely at port. Runtime positions, escort distance, protected-ship damage and active enemy state are rebuilt. | Persist a validated encounter snapshot so a long escort or battle can resume where it was paused. | Save/load supports longer missions without resetting their physical situation. |

## The next playable milestone

Focus first on the opening rescue and one repeatable combat encounter: improve handling feedback, give the attackers different roles, and add one optional distress event between ports. Use the new early-game save slots to compare the experience before and after. Then expand those systems across the existing campaign.

Avoid a broad engine or framework rewrite while making that pass. Keep the supplied assets and improve what the player does around them. Measure frame rate, frame-time spikes and control feel on the actual target devices before expanding graphical complexity. Those measurements are still outstanding.
