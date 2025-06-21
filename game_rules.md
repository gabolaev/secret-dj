# Secret DJ: Rules & Restrictions

## Game Overview
- The game is a real-time, multiplayer music guessing competition.
- Players join a lobby, submit music tracks, and then take turns guessing which player submitted each track.

---

## Game Phases

### 1. Lobby Phase
- All players, including the admin, must submit a set number of music tracks (the number is set by the admin).
- Players can see who has joined and who has submitted their tracks, but **cannot see the tracks themselves** (only their own submissions are visible).
- The admin can change the number of tracks required per player before the game starts.
- The admin is the only player who can start the game, and only after all players have submitted their tracks.

### 2. Gameplay Rounds
- In each round, one track is randomly selected from the pool of unplayed tracks.
- All players (except the one who submitted the current track) listen to the track and try to guess who submitted it. They should see a message "This is your track, just enjoy it!"
- The player whose track is being played cannot vote in that round.
- Each player can only vote once per round, but they can still change their vote before the admin published the results (e.g. concluded the round).
- Optionally, players may also be able to "like" a track in addition to guessing.
- **Players never see the full list of submitted tracks.**

### 3. Voting and Results
- Once all eligible players have voted, the admin is presented with a "Reveal Results" button.
- Only the admin can reveal the results of the round.
- When results are revealed, all players see who submitted the track, who guessed correctly, and any points or likes awarded. We can have something like a list of songs from the previous rounds and who submitted them. 

### 4. Next Round
- After viewing the results, the admin is presented with a "Next Round" button.
- Only the admin can start the next round.
- The game continues with new rounds until all tracks have been played.
- After the last round the button should be "Finish Game" instead of "Next Round"

### 5. Game End
- When all tracks have been played, the game ends.
- A final leaderboard is shown, displaying each player's score and ranking.

---

## Restrictions & Special Rules

- **Admin Role:**
  - The first player to join a new game becomes the admin.
  - If the admin leaves, admin rights are transferred to a **random** remaining player.
  - The new admin receives all admin privileges and responsibilities (changing settings, starting the game, revealing results, starting the next round, etc.).
  - This transfer happens automatically and transparently, ensuring the game can always continue.

- **Player Identity:** Each player is identified by a unique username within the game.

- **Disconnections:** If a player disconnects, their spot and data are preserved. They can reconnect and continue playing.

- **No Cheating:** The identity of the track's submitter is hidden until the admin reveals the results. Players never see the list of tracks submitted by others.

- **One Vote Per Player:** Each eligible player can only vote once per round and cannot change their vote after submitting.

- **No Voting for Self:** The player whose track is being played cannot vote in that round.

- **Game Settings:** Only the admin can change game settings (like tracks per player) and only before the game starts.

- **Game Progression:** The game cannot progress to the next round or reveal results without the admin's action.

---

**These rules ensure a fair, fun, and challenging experience for all players.** 
