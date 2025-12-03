# Prompt to generate code for *Century: Golem Edition* (game server + realtime clients)

Use the following prompt as input to an AI code-generation model. It describes the game (extracted from the provided images), functional/system requirements, coding conventions, suggested tech stack, expected deliverables, and example data/event formats. The goal: produce production-ready code (Go backend + minimal web clients) that implements the game rules, real-time synchronization, event-sourcing replay, fault tolerance, and deployment infrastructure (Docker Compose + Make + sample Ansible playbooks). Be explicit and strict about naming, interfaces, handlers, and architecture.

---

## Project summary (short)

Implement a networked implementation of **Century: Golem Edition** (lightweight digital version) with:

* authoritative Golang game server exposing WebSocket endpoints for real-time play.
* simple web-based JS/HTML clients to show state and send player actions over WebSocket.
* event-sourced architecture persisted to a DB so events can be replayed to reconstruct game state.
* ability for clients reconnecting to catch up (replay missed events since last known event id).
* Redis used as message queue/pubsub for scalability (Redis Streams + Pub/Sub).
* MongoDB or PostgreSQL for event & projection storage (choose one in implementation).
* Docker Compose for local development; example Ansible playbooks for idempotent deploy tasks.

---

## Game description (from the images) — use this as authoritative rules

**Game name:** Century: Golem Edition

**Components (digital equivalents):**

* Point cards (face up row; each has point value and crystal cost).
* Merchant cards (Merchant deck; merchant cards show crystal costs and produce crystals on your caravan).
* Caravan cards (determine starting crystals and first player).
* Crystals: four colors — Yellow, Green, Turquoise (Blue), Magenta (Pink). Represented as integer counts per color.clear
cle
* Copper & Silver tokens (currency tokens) used only for point card visibility/placement (treat as tokens with integer values).
f
**Setup:**

1. Shuffle Point cards; draw 5 and place face up in a row (leftmost is first).
2. Place copper tokens equal to players ×2 above the first (leftmost) point card; place silver tokens equal to players ×2 above the second point card.
3. Merchant cards: make merchant deck. Some specific merchant cards are starting cards (purple border): each player receives `Create 2` and `Upgrade 2` starting cards. Shuffle remaining merchant deck and draw 6 face-up to the left of the deck.
4. Separate crystals into color piles. For initial crystals, players' caravan cards give starting crystals. The table of starting crystals (per number of players) must be implemented as the rule image indicates (but implement configurable starting crystals via environment).
5. Place Caravan card (brown back) per player, shuffle and deal so first player determined by symbol on caravan.

**Turn & Actions:**
On a player's turn they must perform **one** of the following actions:

* **Play**: Play a card from hand (place it face-up in front of you and execute its effect). Card types:

  * **Crystal cards**: place crystal(s) from center into your caravan as shown on the card.
  * **Upgrade cards**: upgrade crystals on your caravan by converting one color to a higher-level color (exact upgrade mapping: Yellow → Green → Turquoise → Magenta).
  * **Trade cards**: return the number and color of crystals shown on the arrow from your caravan into the bowls, then take the number/color shown below the arrow into your caravan.
* **Acquire**: Acquire a Merchant card from the face-up merchant row by paying crystals from your caravan and then take the merchant into your hand; when acquiring leftmost merchant card, no crystals are placed on it.
* **Rest**: Take all previously played cards back into your hand (hand-building mechanic).
* **Claim**: Claim a Point card by returning the crystals shown on it to the diamond bowls. After claiming, draw from Point deck to fill face-up row; if claiming leftmost point card, take a copper or silver token accordingly.

**Card rules & limits:**

* Caravan capacity: A caravan can hold up to **10 crystals**. If at the end of a player’s turn they have more than 10, they must return crystals of choice to bowls to reduce to 10.
* Crystal supply: unlimited (or substitute material). For safety allow configurable substitutes.
* Upgrade chain: each Upgrade card may upgrade a single crystal by one level (i.e., +1 step in chain).
* Trade cards may be played multiple times in a row as long as you have the crystals.
* When acquiring a merchant and placing it in your caravan, any crystals on that merchant card are moved to your caravan.
* Game end: When a player claims his **5th** Point card (for 2–3 players) or the configured number for other player counts, finish the current round so all players had equal turns; then tally points: each point card value + silver/copper tokens worth points (silver=1, copper=3? — implement tokens as configurable points). Non-yellow crystals may be worth points (configurable). Winner is highest total; ties resolved by last player to take a turn wins tie.
