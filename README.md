# Dust & Starlight

Original, single-player 3D frontier space game. Nine systems, six ships, nine crew members, a six-chapter campaign, and independent freight, bounty, salvage, mining, and trading work.

Static HTML, CSS, and ES modules in `dist/`. Three.js r170 is bundled locally under its MIT license; supplied Meshy hulls and stations are combined with procedural planets, navigation hardware, effects, and UI graphics. Three original stereo music scores are bundled as MP3 assets. No network dependencies or external assets are required for play. Saves use browser local storage; import and export are available in Flight handbook.

## Run locally

Clone this repository and serve the game from `dist/`:

```sh
git clone https://github.com/Veribatum/Dust-Starlight.git
cd Dust-Starlight
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080` in your browser. The local server handles the ES modules and GLB files. The game has no build step and uses its bundled assets without a CDN.

Run the existing gameplay, input, layout, and asset checks with Node.js:

```sh
npm test
```

The tests have no npm package dependencies. Asset preparation and music generation are optional; their Python/FFmpeg dependencies are described below. Optimized runtime models and finished music are included.

Production uses GitHub Pages: deploy from main at / (root). The root index opens dist/ and .nojekyll keeps it static. Pushes to main update the same game address. Browser saves belong to their origin; use Export/Import when moving from the earlier host or another device.

## Controls

The title screen always offers **New Game** and **Load Game**, with **Continue** when a voyage is available. New Game preserves the current voyage under **Previous voyage** before restarting the opening chapter. Three independent manual slots keep earlier chapters available for testing.

Open the captain's menu with **Escape** on desktop, the menu button on a phone, or Start during gamepad flight. Choose **Save Game** to write a slot, **Load Game** to browse autosave/manual slots/Previous voyage, or **Main Menu** to return to the title. Existing slots require confirmation before overwrite or deletion. Loading during play asks before replacing the active voyage and keeps it as Previous voyage.

Loaded saves restore the ship, cargo, crew, and contract progress at the saved system's port. In-progress escort routes, damage to protected NPCs, and exact flight positions are rebuilt rather than restored; the UI describes this as a port checkpoint. Continue after returning to the title in the same session resumes the existing flight. The original version-1 autosave and JSON exports remain compatible. Saves stay in the current browser/origin; use Export/Import from Load Game when changing devices or moving between local and hosted copies.

Click the flight view to engage cursor steering; center the cursor to fly straight. Left-click or Space fires. T releases mouse flight. WASD or arrows also steer. R/F or mouse wheel adjusts thrust. B brakes; hold Q to scan or transfer. Ship preferences include sensitivity, cursor/drag steering, pitch inversion, and roll-leveling assistance. Shift boosts; M fires a missile; Tab targets; V engages autopilot; E docks; G opens the chart; C opens crew; L opens the log; Z/X rolls; Escape pauses. Touch joystick, thrust slider, and action buttons support mobile play. Gamepad controls are described in-game.

## Validation

`npm test` checks the campaign, trade economics, cargo limits, upgrades, crew bonuses, saves, swept projectile collisions, actual cannon hits, patrol scans, salvage, docking, and UI wiring. Browser visual and device QA remain unverified in the creation environment because the browser control capability was unavailable.

There is no build step. GitHub Pages serves the root entry and dist/ assets directly. The older Sites manifest is retained for provenance.

## World and interface revision

Nine distinct stations now span roughly 0.8–1.6 km. Each system has 8–20 commercial ships, with bulk haulers, tankers, liners, and shuttles following arrival, berthing, departure, and jump-away cycles. Traffic continues during port views. The cockpit, port interface, and ship surfaces have been restyled and detailed. Music changes between frontier, deep-space, and combat scores; effects and music have separate persistent volume controls. Existing voyage saves keep the same format.

Original music can be regenerated with `scripts/compose_music.py`, NumPy, and FFmpeg.

## Nova fighter

The Nova ship class (save ID `kestrel`) and fighter NPCs use the uploaded Meshy GLB. The web copy keeps all 13,152 vertices, 12,646 triangles, and three 2K PBR textures; embedded JPEGs are repacked to reduce download size. The original upload is unchanged. Geometry and texture resources are shared safely across instances. Three exhaust emitters match its rear engines. Shipyard hull inspection is free; purchasing retains the existing 6,800-credit fighter price and ship stats.

The bundled GLTFLoader and BufferGeometryUtils are from Three.js r170 and use the existing Three.js MIT license.


## Encounters, travel, and fleet revision

The six story chapters now involve clinic rescue, a mining-lane escort, three black-box scans, a covert evidence handoff, carrier defense, and the final relief convoy. In-space missions pay on completion. Each port also offers two local encounter types. Escorts hold if their captain falls behind; their attackers shoot at the transport, and destroyed transports can be retried from the log. Existing accepted contracts retain their earlier objectives and stay valid in version-1 saves.

Finishing a scan, transfer, escort, or defense retires the objective without deleting surviving ships or wrecks during the current visit. Contacts report decoded recorders, received supplies/evidence, and secured carriers; objective glows switch off. Scanned wrecks remain visible when a partially completed survey is restored. Recovering salvage removes the cargo but leaves a wreck's hull visible and prevents collecting it twice. Unfinished attackers remain in the world with ordinary combat behavior.

Ships leave their berth facing away from the station. A jump request enters a cancellable departure phase, flies clear of the station, aligns outward, then engages the drive. Fuel is charged on arrival. Arrivals acquire an active mission target; station navigation uses a detour when the direct route crosses the core.

The fourteen additional uploads are prepared with `scripts/prepare_fleet.py` (NumPy, Pillow, Node.js and the vendored MIT meshoptimizer 1.2 simplifier). Their game copies use reduced meshes and 1K textures. Originals are untouched; source hashes and sizes are in `dist/models/fleet-manifest.json`. Model requests are deduplicated and limited to two simultaneous loads. Phones use smaller decoded textures. Imported geometry and textures are shared across actors, with materials owned per instance.

Bellwether uses the Cristal habitat and Crown the interstellar spire. The other seven stations have distinct procedural silhouettes. Rustwren, Mule, Peregrine, Vortex Z3, and Crimson Vanguard use supplied hulls; Nova retains its original fighter model. Free shipyard inspection is available for every hull. Commercial routes and mission encounters use the carriers, motherships, freighters, and scouts.

`npm test` also verifies all encounter types, in-space settlement, failure/retry, partial-progress saves, legacy contracts, all-station departures, safe warp trajectories, real pointer and keyboard event handlers, controller timing, braking, boost recovery, asset parsing, and streaming concurrency. These checks do not establish browser frame rate or subjective control feel. Browser/device visual QA is still unavailable in this environment.


## Touch cockpit

Mobile and narrow windows use a separate cockpit. Hull, shield and power have larger labels, percentage values and six-pixel bars directly over the flight view, with no surrounding box. The objective occupies one strip. A fixed thumbstick and vertical thrust slider have separate bounds on the left, with a Stop button. Fire, boost, missile and target controls sit on the right. One context button handles approach assistance, braking, docking, scan/transfer and departure cancellation. The menu keeps chart, crew, objectives, contacts and audio accessible.

Positions are computed from the live viewport and safe-area insets, including landscape notches and the home indicator. Radio previews are short; full messages remain in the menu. Mobile shows a selected contact and up to two hostile brackets, with resources available in Contacts. Large desktop readouts and radar are hidden, and touch overlays avoid backdrop filters.

The tests cover distinct touch pointer releases, multi-touch steering/fire, pause cleanup, slider direction and bounds, held transfers, context transitions, safe areas and non-overlapping controls at ten phone/tablet sizes, live layout assignment, and desktop restoration. These are input and geometry checks; Safari/iPhone visual QA has not been performed in this environment.


## Story, stations and crew release

New Game starts a skippable 33-second in-engine convoy incident, then Ada’s briefing. Cinder has a 14,800-credit cooperative repair lien; completing the six relief chapters clears it while contract pay stays yours. Each chapter has personal context and a question/answer. The title and briefings can replay the opening without replacing a voyage.

Docking shows the actual current hull inside a lit 3D hangar with cargo, gantry, service cart and open aperture. Hangar doors lead to Dispatch, Market, Workshop, Concourse, common room and registry. Portrait phones use a bottom sheet with the ship above; landscape keeps it beside the panel. Dispatch filters freight and in-space work. The Workshop groups repairs, fuel and missiles at its service desk.

Meridian, Saffron and Vesper add customs, refinery and observatory destinations. Each station has contacts, local information and shared meals. The new ports have persistent one-time choices to help with relief work or sell a lead to a broker. Relay repair requires restarting three components and attracts raiders. Interception starts on approach; the courier flees and jumps after 90 seconds if not stopped.

Nine recruits form a permanent roster. Working berths are Vortex1, Nova2, Rustwren3, Vanguard3, Peregrine5 and Mule6. Standby crew keep their trust and can be assigned at any port. The quartermaster cannot be stood down if doing so would discard cargo. Six specialists require meeting them in their home system and earning standing. Only assigned people provide bonuses. The illustrated common room shows working crew; standby crew can talk by comms. Topics change with story and trust, and conversations, meals and relief runs build trust. Repeating a topic cannot farm trust within a chapter.

Registry flags record offences and create pursuit at heat3; stronger warrants add interdiction ships on arrival. Controlled cargo, unlicensed work, evaded scans and attacks on patrols leave records. A staffed port can settle the record after controlled cargo is gone. Three minutes of clean unregulated flight eases search pressure. Faction standing improves later pay.

Capital hulls are520–980m compared with13–26m player ships. Large ships use slow external terminal routes with size-derived clearance and targeting radii. Twelve hulls were regenerated from verified originals to repair reduction cracks: welded open edges225,662→1,925, while the originals contain4,330. Carrier, Leviathan and Vanguard are closed again. Positions, normals and UVs remain from source; seven difficult hulls use bounded seam relaxation (maximum reported appearance error0.828%). No surfaces were invented. The fleet totals24.15MB, only3.8% larger; budgets are22–40k triangles. The manifest and independent topology tests document this. Nova and station geometry remain unchanged; some defects exist in their originals.

Current checks also cover chapter cameras, phone/desktop hangar framing, crew reassignment, relationships, local choices, registry consequences, both new missions and the Pages root entry. Actual browser/iPhone visual QA and measured frame rate remain outstanding. Loaded voyages remain port checkpoints: exact escort locations, NPC damage and interception timers rebuild.
