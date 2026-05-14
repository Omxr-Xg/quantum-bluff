# Individual contribution report — Linda Baouab

## 1. Overview

During the four-month Quantum Bluff project, my contribution was transversal. I did not work on only one isolated feature: I contributed to the analysis phase, documentation, UI/UX, frontend integration, backend routes, real-time communication, social features, moderation, security hardening, debugging, GitLab CI stabilization and the final report.

Quantum Bluff is a real-time multiplayer web platform built around poker and extended with blackjack, roulette, slots, tournaments, friends, invitations, player reports, progression and an admin/security layer. Because of that scope, my work often required moving between several layers of the stack: React/TypeScript on the client, Node/Express/Socket.IO on the server, Prisma/PostgreSQL for persistence, Redis for real-time and security coordination, and GitLab CI/CD for validation.

I also used AI tools during the project. At first, I used ChatGPT to help structure my understanding, reformulate documentation, analyze issues and prepare contribution summaries. Later, I used Codex more directly for codebase navigation, implementation, debugging, test repair, security hardening, report writing and Git operations. AI assistance was used as a support tool: I still reviewed the results, tested the implementation, asked for corrections when behavior was wrong, and validated the final changes through commits, builds, tests and pipeline checks.

## 2. Initial analysis and project framing

At the beginning of the project, I participated in understanding the product objective and the technical requirements. Since the initial subject was a Texas Hold'em poker platform, I studied the rules of the game to understand the main phases of a hand: blinds, preflop, flop, turn, river, showdown, betting actions, player positions, pot logic and table flow.

I also looked at existing poker projects and similar multiplayer game architectures to understand how game state, backend routes, sockets and frontend tables could be organized. This helped me contribute more effectively later, because many bugs in a poker project are not only visual bugs: they can involve turn order, player identity, card display, synchronization, or server authority.

During the specification phase, I contributed to the project documentation and helped clarify functional and technical requirements. My work included the general architecture description, security expectations, real-time communication needs, authentication constraints, and the relationship between frontend, backend and database. I also helped with planning-related work, including the Gantt chart and the organization of tasks and responsibilities.

## 3. Documentation and project reporting

I contributed to several documentation areas during the project. This included early project documentation, security reports, UI/UX reporting, and the final report.

My documentation work covered:

- the initial requirements and project framing;
- security documentation and audit-style reports;
- explanations of authentication, WebSocket security and anti-cheat measures;
- UI/UX improvements and visual evolution;
- the final project report sections assigned to me;
- technical descriptions of real-time synchronization and implemented solutions;
- the generation and update of the final PDF report.

For the final report, I worked specifically on the sections:

- **Authentication and anti-cheat**;
- **Real-time communication**;
- **Implemented solutions**.

These sections were completed in English and aligned with the actual codebase. They cover the whole project, not only isolated features. The real-time section explains Socket.IO, rooms, reconnects, snapshots, Redis support and state confidentiality. The authentication and anti-cheat section explains JWT, Bearer tokens, 2FA, blacklist, suspended accounts, socket authentication, rate limits and suspicious behavior tracking. The implemented solutions section was expanded to cover poker, hidden bets, casino games, blackjack, tournaments, social features, progression, UI, tests, security and operations.

I also updated the LaTeX compilation workflow by fixing `Docs/compile-rapport.sh` so that it uses the correct `pdflatex.exe` on Windows when available. This allowed the final report PDF to be regenerated reliably from the project script.

Representative commits include:

- `docs: complete final report sections`;
- changes to `Docs/rapport.tex`;
- regeneration of `Docs/rapport.pdf`;
- update of `Docs/compile-rapport.sh`.

## 4. Backend and game logic contributions

I contributed to backend work related to game routes, waiting rooms, table configuration and integration with the frontend. Earlier in the project, I worked on REST routes and game-related backend adjustments, including blinds setup, game table behavior, and route completion.

Representative work included:

- adding and completing game REST API routes;
- integrating blinds configuration into the game table flow;
- correcting backend behavior around player state and game state;
- connecting backend routes with frontend UI actions;
- fixing backend connectivity issues during local development;
- helping stabilize server boot and diagnostics.

Representative commits from the project history include:

- `feat: add game REST API routes`;
- `feat: add blinds setup to game table`;
- `completed routes.ts`;
- `fixed playerstate error`;
- `backend connectivity fix`;
- `chore(dev): improve server boot diagnostics`;
- `chore(dev): add Windows dev script`;
- `chore: improve local AI dev startup`.

This work helped me understand how the backend controls the game and why server authority is essential in a multiplayer poker platform.

## 5. Real-time communication and Socket.IO

Real-time behavior was one of the most important parts of my contribution. I worked on Socket.IO features from both a user-experience and security perspective.

My work included:

- real-time friend request notifications;
- real-time friend status and activity presence;
- lobby activity updates such as "Poker room", "Blackjack room", "Roulette room" and "Mini-games room";
- friend message notifications;
- room invitations;
- blocked-user warnings before entering a room;
- warning flow when joining by invitation;
- warning flow when a blocked user enters a room after I have already joined;
- securing sockets so that a user cannot act as another player;
- validating socket users against the authenticated JWT identity;
- making socket gateway tests independent from an unprepared CI database schema.

The most recent socket and pipeline work included fixing a CI failure in `gameGateway.realtime.integration.test.ts`. The test previously created users directly with Prisma, but the GitLab test database did not contain the `User` table at that moment. I fixed this by decoupling the socket gateway tests from the real database schema using a Prisma mock, while keeping the gateway behavior tested. After that, the backend suite passed locally with 51 test suites and 520 tests.

Representative commits include:

- `fixed the friends notifications`;
- `notifications amis securisees`;
- `real time friend request notification`;
- `Track friend activity presence`;
- `security: validate realtime game users`;
- `test: decouple socket gateway tests from database schema`.

## 6. Friends, invitations, blocking and moderation

A major part of my contribution was the social system around friends, invitations, blocking, unblocking, reporting and lobby interactions.

I worked on the friends feature from several angles:

- improving the friend list display;
- integrating friend interactions directly into the lobby;
- adding an "add friend" flow from the lobby;
- making the friend block in the lobby clickable and redirecting to the friends page;
- displaying friend avatars, online indicators and current activity;
- adding message buttons from the friend list;
- opening chat directly inside the lobby instead of redirecting unexpectedly;
- fixing user search when adding a friend;
- excluding blocked users from friend search;
- adding blocked users management;
- adding unblock functionality;
- adding report functionality with a reason;
- ensuring reports are persisted for admin review;
- protecting room invitations and joins when blocked users are involved.

The blocking behavior was refined through multiple scenarios:

- if the blocked user is the host, the room should not appear;
- if the blocked user is only a member, the room can appear but joining requires a warning;
- if the user receives an invitation to a room containing someone blocked, a warning is shown before joining;
- if a blocked user enters the room after I have already joined, a warning is displayed asking whether to stay.

Representative commits include:

- `friends: add block and unfriend endpoints`;
- `db: add user block model and migration`;
- `feat(friends): add block/unblock/report user interactions in friends page`;
- `Add blocked users tab and unblock functionality in Friends UI`;
- `Fix friend search to exclude blocked users and add blocked users management`;
- `feat: add friend actions to friends page`;
- `feat: add lobby friend actions`;
- `api: expose friend moderation mutations`;
- `rooms: enforce blocked host visibility`;
- `invitations: guard blocked room accepts`;
- `invitations: show blocked room warning`;
- `waiting-room: warn when blocked user joins`;
- `i18n: add friend moderation labels`.

This feature required coordination between database schema, backend routes, API mutations, frontend UI, Socket.IO events, lobby behavior and moderation logic.

## 7. Lobby and desktop layout

I worked extensively on the lobby because it is the main hub of the application after login. The lobby had to fit correctly on desktop, remain readable, avoid excessive empty space, and expose the most important features without forcing unnecessary navigation.

My work included:

- restoring scroll where necessary;
- preventing unwanted desktop page overflow;
- fitting all lobby elements on screen;
- resizing left and right lobby panels;
- expanding tournament and server sections;
- reducing and reorganizing the friends and daily challenges blocks;
- removing unnecessary scrollbars in daily challenges;
- reducing bottom empty margins;
- adding the "add friend" button at the bottom of the friends block;
- making the friends block clickable;
- integrating the add-friend modal directly in the lobby;
- improving empty states such as "No friends yet";
- fixing layout after rebase conflicts.

Representative commits include:

- `Adjust lobby desktop layout`;
- `layout: prevent desktop lobby page scroll`;
- `fix: remove friends block scrollbar`;
- `style: hide idle lobby friends scrollbar`;
- `style: compact empty lobby friends card`;
- `feat: add friend modal in lobby`;
- `layout: contain desktop lobby panels`;
- `layout: tighten desktop lobby frame`;
- `fix: resolve lobby rebase conflicts`.

## 8. UI/UX and frontend contribution

I contributed strongly to the user interface and visual identity of the application. I worked on the lobby, navigation, authentication pages, profile, friends page, poker table, blackjack, roulette, mini-games, settings and mobile/responsive layouts.

My UI/UX work included:

- global restyling of the application;
- improving the navigation bar;
- adjusting colors and theme coherence;
- integrating and modifying the logo;
- improving the bot configuration UI;
- improving the lobby blocks and mini-game cards;
- harmonizing profile and settings screens;
- improving responsive behavior;
- fixing scrollbars and page overflow;
- making the application feel more like a modern game interface.

Representative commits include:

- `general restyling`;
- `adjusted some colors`;
- `barre de navigation`;
- `theme de bot config`;
- `barre de navigation bot config`;
- `modification du logo`;
- `mini jeux`;
- `blocs minijeux`;
- `responsive`;
- `etiquettes version mobile`;
- `bouton ranking mobile`;
- `generalized scrollbar`;
- `modification scroll barre`.

## 9. Poker table visual work

I worked a lot on the poker table, which is one of the most visible and important screens of the project.

My contributions included:

- positioning the poker table;
- moving and adjusting cards;
- fixing card display;
- improving community card rendering;
- changing the back of the cards;
- improving rounded card visuals;
- replacing and repositioning action buttons;
- improving the timer;
- adding or adjusting player connection circles;
- improving avatar display around the table;
- adjusting the in-game layout for readability.

Representative commits include:

- `fixation de la table`;
- `remonter la table`;
- `modif table`;
- `remonte des cartes`;
- `cartes`;
- `fixed cards`;
- `replacement des boutons`;
- `cercle connexion`;
- `changement du mineuteur`;
- `minuteur fix`;
- `rounded cards`;
- `community cards fix`;
- `changed the back of the cards`.

This work required many iterations because poker table UI is very sensitive: small layout mistakes can hide cards, misalign players, confuse action buttons or reduce readability during a hand.

## 10. Profile, avatars and settings

I contributed to profile and avatar features, including both bug fixes and visual improvements.

My work included:

- fixing profile modification behavior;
- making avatars display correctly;
- refreshing avatars after update;
- allowing local images as avatars;
- improving login/logout avatar behavior;
- harmonizing the profile page;
- improving profile-related UI consistency.

Representative commits include:

- `profile modification fix`;
- `lavatar saffiche`;
- `connexion deconnexion avatar`;
- `avatar refresh fix`;
- `image local comme avatar`;
- `harmoniser profile`;
- `profil`.

I also worked on settings and audio. One important improvement was separating background music from sound effects, which made the application closer to a real game experience. Instead of one global audio switch, the user can control music and sound effects more independently.

Representative commit:

- `ajout d'effets sonores + separation`.

## 11. Blackjack, roulette and mini-games

I also contributed to casino and mini-game areas.

For blackjack, I worked on visual layout, navigation and compact desktop scaling. The goal was to make the table scene fit better on different desktop sizes and to separate controls from the table presentation.

Representative commits include:

- `blackjack`;
- `barre de navigation blackjack`;
- `fix blackjack`;
- `style: dynamically scale blackjack table scene`;
- `layout: separate blackjack table controls`;
- `style: scale blackjack table for compact desktops`.

For roulette, I worked on the history display and layout adjustments.

Representative commits include:

- `rendering of history in roulette`;
- `deplacement de l'historique`;
- `modification de roulette`.

For mini-games, I improved the way the mini-game blocks appeared in the lobby and contributed to their frontend integration.

Representative commits include:

- `mini jeux`;
- `blocs minijeux`;
- `front end blackjack`.

## 12. Security contribution

Security was one of the largest parts of my work. I contributed to security in several phases: input validation, authentication hardening, Socket.IO protection, admin route protection, anti-cheat, production surface hardening, tests and documentation.

My security work included:

- adding or strengthening Zod validation schemas;
- using `sanitize-html` where user-provided content could be displayed;
- improving JWT handling;
- removing unsafe token behaviors;
- enforcing strict Bearer token format on HTTP routes;
- aligning HTTP and Socket.IO authentication;
- checking token blacklist for revoked tokens;
- rejecting admin tokens on player routes;
- rejecting missing users even when the JWT is structurally valid;
- blocking suspended accounts at login, REST middleware and socket connection;
- enforcing strong password policy for registration, reset and profile changes;
- strengthening TOTP/recovery flows;
- protecting waiting room identity from forged request bodies;
- locking down production-only surfaces;
- adding tests for trusted waiting-room host identity;
- ensuring socket gateway tests do not require an unprepared database.

Representative commits include:

- `security: enforce authenticated waiting room identity`;
- `security: harden socket authentication and room access`;
- `security: strengthen two factor recovery flows`;
- `security: lock down production surfaces`;
- `fix: send auth headers for waiting room requests`;
- `security: enforce strong password policy`;
- `security: block suspended users from auth flows`;
- `security: validate realtime game users`;
- `security: harden bearer and socket token checks`;
- `test: cover trusted waiting room host identity`;
- `test: decouple socket gateway tests from database schema`.

I also contributed to security documentation:

- `Docs/security/Security_Audit.md`;
- `Docs/security/rapport_phase1_securite_quantum_bluff.md`;
- `Docs/security/rapport_phase2_securite_quantum_bluff.md`;
- the final report security section.

## 13. Admin routes, moderation and reports

I worked on admin and moderation-related security. This included route protection, centralized admin access, and ensuring sensitive functionality was not exposed without proper checks.

My work included:

- centralizing admin access control;
- protecting runtime and override routes;
- separating admin and player token usage;
- making player reports persist so administrators can review them;
- ensuring reported users and suspicious users can be surfaced for moderation;
- documenting the security model around admin routes.

Representative commits include:

- `centralized admin access`;
- `admin routes protection`;
- `feat(security): centralize admin access control and admin env flags`;
- `refactor(security): unify protection for admin runtime and override routes`;
- `feat(security): mount protected poker runtime and roulette override admin routes`;
- `fix(security): correct poker admin runtime routing and cleanup duplicate mounts`.

## 14. Testing and CI stabilization

I contributed to tests and pipeline stabilization. This included writing or extending tests and fixing failures caused by environment differences between local development and GitLab CI.

My work included:

- strengthening validation schema tests after password policy changes;
- testing trusted waiting-room host identity;
- testing socket gateway behavior with authenticated users;
- fixing the CI failure caused by direct Prisma user creation in a database without the expected table;
- running full backend test suites and coverage locally;
- resolving lockfile and dependency-related CI issues.

Recent validation after the pipeline fix:

- `npm run lint`: passed with existing warnings only;
- `npx tsc --noEmit`: passed;
- `npm test -- --runInBand`: 51 suites passed, 520 tests passed;
- `npm run test:coverage -- --runInBand`: 51 suites passed, 520 tests passed.

Representative commits include:

- `test: cover trusted waiting room host identity`;
- `test: decouple socket gateway tests from database schema`;
- `fix(server): sync lockfile with jest 29`;
- `fix: reject tokens for missing users`;
- `fix: send auth headers for waiting room requests`.

## 15. Debugging and development environment

A significant part of my work was also practical debugging. I had to solve issues that were not always visible as product features but were necessary to make the project run.

I worked with:

- Windows;
- PowerShell;
- WSL;
- Docker Desktop;
- Docker Compose;
- Node.js and npm;
- Prisma;
- PostgreSQL;
- Redis;
- Git and GitLab;
- GitLab CI;
- VM deployment;
- Nginx;
- HTTPS;
- Socket.IO.

Problems I encountered or helped resolve included:

- `concurrently` not found;
- npm install and lockfile mismatches;
- Node/npm version issues;
- Docker Desktop and WSL problems;
- backend not reachable from frontend;
- Vite proxy issues;
- port `3000` conflicts;
- Prisma client or schema errors;
- PostgreSQL connection issues;
- WebSocket issues behind proxy/Nginx;
- JWT/token errors;
- player state synchronization errors;
- merge and rebase conflicts;
- GitLab pipeline failures.

Representative commits include:

- `backend connectivity fix`;
- `fix(server): sync lockfile with jest 29`;
- `chore(dev): add Windows dev script`;
- `chore(dev): improve server boot diagnostics`;
- `chore: improve local AI dev startup`;
- `correction de l'exposition du backend sur 3000`;
- `fixed playerstate error`;
- `resolved conflict`;
- `fix: resolve lobby rebase conflicts`.

## 16. Git workflow and project integration

I used Git throughout the project to integrate changes, resolve conflicts, create multiple commits, push branches and prepare merge requests. During the later phase, I worked mainly on the `IHM/friends` branch, then pushed changes and followed up when the merge request pipeline failed.

My Git-related work included:

- splitting work into multiple logical commits;
- pushing feature branches;
- resolving conflicts after rebases or merges;
- checking `git status` before commits;
- avoiding unrelated files such as `Docs/main.tex` when not part of the task;
- fixing a failing pipeline after merge request feedback;
- verifying local test and coverage results before pushing.

Recent representative commits on `IHM/friends` include:

- `security: enforce strong password policy`;
- `security: block suspended users from auth flows`;
- `security: validate realtime game users`;
- `security: harden bearer and socket token checks`;
- `test: cover trusted waiting room host identity`;
- `docs: complete final report sections`;
- `test: decouple socket gateway tests from database schema`.

## 17. AI-assisted work

I used AI tools as part of my workflow, and this should be mentioned transparently in the project report.

At the beginning, I used ChatGPT to:

- structure my contribution report;
- reformulate documentation;
- summarize my timesheet and project work;
- help organize ideas about the architecture and security;
- prepare text for the final report.

Later, I used Codex to:

- inspect the repository;
- search through code and commits;
- implement UI changes;
- implement security hardening;
- fix bugs in friends, lobby and invitations;
- write and adjust tests;
- diagnose GitLab pipeline errors;
- update LaTeX final report sections;
- regenerate the PDF report;
- organize commits and pushes.

AI output was not used blindly. I reviewed the proposed changes, asked for corrections when behavior was wrong, tested the implementation, checked the UI and validated the result through Git commits, local tests and CI-oriented commands.

## 18. Skills developed

This project helped me improve skills in several areas:

- React and TypeScript frontend development;
- Node.js and Express backend development;
- Prisma and PostgreSQL usage;
- Socket.IO real-time communication;
- JWT authentication and application security;
- route protection and admin access control;
- moderation features such as blocking and reporting;
- UI/UX design and responsive layouts;
- debugging on Windows, WSL and Docker;
- Git, branches, merge requests and conflict resolution;
- GitLab CI pipeline analysis;
- LaTeX report editing and PDF generation;
- technical writing in English and French;
- AI-assisted engineering with human validation.

## 19. Personal assessment

My role evolved during the project. At the beginning, I contributed to analysis, research, project framing and documentation. Then I moved into backend routes, security and real-time features. Later, I contributed heavily to UI/UX, the lobby, friends, profile, poker table visuals, blackjack, roulette and responsive behavior. In the final phase, I worked on security completion, pipeline stabilization and the final report.

This gave me a complete view of a real full-stack project: not only writing code, but also understanding how frontend, backend, database, sockets, security, tests, documentation and deployment interact. I also learned that many important contributions are iterative: a feature is rarely finished after one commit. It often requires debugging, user testing, layout adjustment, backend validation, security checks, tests and pipeline repair.

## 20. Short version for the final report

During Quantum Bluff, I contributed transversally to analysis, documentation, UI/UX, backend, real-time communication, security, social features and project stabilization. I first participated in the framing phase by studying Texas Hold'em rules, analyzing similar projects, helping with the requirements document and contributing to planning through the Gantt chart. I then worked on backend routes, game table behavior, blinds configuration and bug fixes related to player state and connectivity.

A major part of my work focused on security and real-time features. I contributed to JWT hardening, strict Bearer token handling, token revocation, TOTP recovery flows, strong password policy, suspended-user checks, admin/player role separation, Socket.IO authentication, waiting-room identity protection and anti-cheat/moderation behavior. I also worked on friends, invitations, blocking, unblocking, reports, blocked-user warnings and lobby-integrated friend interactions.

On the frontend, I contributed strongly to the visual identity and user experience: lobby layout, navigation, profile, avatars, poker table, cards, timer, blackjack, roulette, mini-games, audio settings and responsive design. I also helped stabilize the development environment and GitLab CI by resolving issues related to Docker, WSL, npm, Prisma, PostgreSQL, WebSocket behavior, merge conflicts and failing tests. Finally, I completed the final report sections assigned to me, regenerated the PDF report and documented the implemented technical solutions.

## 21. Professional version for the final report

Within the Quantum Bluff project, I had a transversal role covering functional analysis, documentation, frontend development, backend integration, security, real-time communication and project stabilization. I contributed to the initial analysis by studying Texas Hold'em rules, comparing existing poker projects, improving the requirements document and helping structure the project planning. I also contributed to technical documentation, security reports and the final project report.

On the technical side, I worked on backend routes, game table adjustments, waiting-room identity, friend and invitation APIs, and several real-time Socket.IO flows. I contributed to the social layer by implementing or improving friends, messages, invitations, blocking, unblocking, reporting, blocked-user warnings and lobby-integrated friend interactions. I also contributed to application security by strengthening JWT authentication, Bearer token validation, socket authentication, suspended-account checks, password policy, TOTP recovery flows, admin route separation and tests around trusted user identity.

I also played an important role in the UI/UX of the application. I improved the lobby layout, navigation, profile page, avatars, poker table, cards, timer, blackjack, roulette, mini-games, audio settings and responsive behavior. In the final phase, I helped stabilize the project by fixing a GitLab pipeline failure, decoupling socket gateway tests from an unprepared test database, validating the backend suite locally, and updating the final LaTeX/PDF report. These contributions allowed me to develop a global full-stack perspective, combining product design, real-time systems, security, testing, debugging and technical writing.
