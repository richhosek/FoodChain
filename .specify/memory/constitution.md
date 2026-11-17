<!--
Sync Impact Report
Version change: 3.0.0 -> 3.1.0 (adds a performance-testing workflow gate)
Modified principles: none
Modified sections: Development Workflow
Added sections: none
Removed sections: none
Follow-up TODOs: none.
-->

# Food Chain Constitution

## Core Principles

### I. Gameplay Rules Must Be Explicit and Testable

Gameplay changes MUST describe their rules, triggers, outcomes, and edge cases in a specification
before implementation. Rule changes MUST have automated tests covering representative outcomes and
boundary cases, including interactions between rules. Unresolved alternatives MUST be marked as open
decisions rather than silently treated as established rules. A language, game engine, or graphics
engine change MUST preserve the currently specified mechanics unless a separate, approved gameplay
change explicitly revises them. This keeps evolving mechanics verifiable.

### II. Mobile-First, Cross-Input Play

The initial playable version MUST target web browsers and support both mouse input on desktop and
touch input on mobile. Gameplay and controls MUST remain usable at mobile and desktop screen sizes,
and equivalent actions MUST be available through both input methods. Input behavior and responsive
layouts MUST be validated on both form factors. Language and engine choices MAY change when
performance requirements warrant it without weakening these platform and interaction requirements.

### III. Evaluate the Engine Against Game Needs

Programming language, game engine, and graphics engine choices MAY change when performance
requirements warrant it. Before adopting a change, the team MUST compare candidates against measured
performance requirements, browser and target-platform support, square and hexagonal grids, mouse and
touch input, creature states and animations, and screen transitions. The selected technologies,
evidence, tradeoffs, and mechanics-parity plan MUST be recorded before production adoption. This
keeps technology choices responsive to game needs without treating a change as automatically faster.

### IV. Prototype Mechanics Before Art

Early gameplay prototypes MUST represent creatures with colored numbers so that mechanics can be
tested and refined before production art is required. Gameplay rules MUST be testable independently
of creature sprites and screen transitions. Later visual assets MUST be able to represent creature
states without changing the underlying rules.

### V. Reproducible, Reviewable Game Behavior

Gameplay logic MUST distinguish deterministic rules from intentionally random behavior. Tests MUST be
able to reproduce random outcomes, and changes to grid behavior, creature interactions, progression,
or board-wide effects MUST include focused verification. This makes chain reactions and edge cases
reliable to investigate. Before a technology change is adopted, automated parity tests MUST compare
the existing and replacement implementations using equivalent initial states, inputs, and random
sequences. They MUST verify mechanics, outcomes, scoring, and progression, including representative
boundary cases, unless an independently approved gameplay change explicitly changes those behaviors.

## Platform and Technology Constraints

- The first target MUST remain a browser-based game, with mobile play as a primary goal. The selected
	language and game and graphics engines MUST support the target browsers and MAY change when
	justified by performance requirements.
- Square and hexagonal grids are both candidates for exploration; neither is selected by this
	constitution. Their movement and replenishment rules MUST be specified and tested separately.
- Engine selection MUST account for animated creature states, movement, and screen transitions as
	well as the game mechanics and target input methods.
- Bonus features and monetization are future considerations, not requirements for the initial
	mechanics prototype.

## Development Workflow

- Capture gameplay proposals, open questions, and acceptance criteria in feature specifications before
	planning or implementing them. Record decisions when alternatives are resolved.
- Compare engine candidates after the mechanics have been explored; document the decision and its
	implications in the implementation plan.
- For a language, game engine, or graphics engine change, document the performance requirements,
  measure comparable workloads, and pass automated mechanics-parity checks before production adoption.
- Verify rules with automated tests and validate the playable experience with mouse and touch at
	desktop and mobile sizes before considering a gameplay change complete.
- Performance tests MUST run only after all applicable game mechanics and UI actions for the change
	have been verified successfully. Performance tests MUST run separately from other tests and from
	concurrent performance tests to avoid measurement interference. If prerequisite verification fails
	or is incomplete, performance testing MUST remain pending and the reason MUST be recorded.
- Keep placeholder visuals until mechanics have been tested and refined; introduce art and animation
	through separately specified work.

## Governance

This constitution governs project specifications, plans, implementation, and reviews. Amendments MUST
document the proposed change and its impact, receive project owner approval, update this document and
its Sync Impact Report, and identify any required migration or follow-up work.

Constitution versions use semantic versioning: MAJOR for backward-incompatible principle removals or
redefinitions, MINOR for new principles or materially expanded guidance, and PATCH for clarifications
or other non-semantic refinements. The amendment date MUST be updated when the constitution changes.

Each specification, plan, and implementation review MUST check applicable principles, record any
conflicts, and resolve them or obtain a documented project owner-approved amendment before proceeding.

**Version**: 3.1.0 | **Ratified**: 2026-11-14 | **Last Amended**: 2026-11-16
