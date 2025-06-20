import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import type { GameState } from '../../common/types'
import { PlayedTracksList } from './PlayedTracksList'
import { MyTracksList } from './MyTracksList'
import { TrackPlayer } from './TrackPlayer'
// Define a type for socket responses
type SocketResponse = { success: boolean; [key: string]: unknown }
import './App.css'

const BACKEND_URL = '/'
let socket: Socket | null = null

function App() {
  const [username, setUsername] = useState('')
  const [gameId, setGameId] = useState('')
  const [mode, setMode] = useState<'lobby' | 'game' | 'loading'>('lobby')
  const [error, setError] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [trackUrl, setTrackUrl] = useState('')
  const [vote, setVote] = useState('')
  const [likeLoading, setLikeLoading] = useState(false)

  // Connect to backend if not already connected
  function getSocket() {
    if (!socket) {
      socket = io(BACKEND_URL)
      console.log('Connecting to backend at', BACKEND_URL)
      socket.on('connect', () => {
        console.log('Socket connected:', socket?.id)
      })
      socket.on('disconnect', () => {
        console.log('Socket disconnected')
      })
      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err)
      })
      socket.on('gameState', (state: GameState) => {
        console.log('Received gameState:', state)
        setGameState(state)
      })
    }
    return socket
  }

  const handleCreateGame = () => {
    setMode('loading')
    setError(null)
    const s = getSocket()
    s.emit('createGame', { username, settings: { tracksPerPlayer: 2 } }, (res: SocketResponse) => {
      if (res.success) {
        if (typeof res.gameId === 'string') {
          setGameId(res.gameId)
          localStorage.setItem('gameId', res.gameId)
        } else {
          setGameId('')
        }
        localStorage.setItem('username', username)
        setMode('game')
      } else {
        setError(typeof res.error === 'string' ? res.error : 'Failed to create game')
        setMode('lobby')
      }
    })
  }

  const handleJoinGame = () => {
    setMode('loading')
    setError(null)
    const s = getSocket()
    s.emit('joinGame', { gameId, username }, (res: SocketResponse) => {
      if (res.success) {
        setGameId(gameId)
        localStorage.setItem('gameId', gameId)
        localStorage.setItem('username', username)
        setMode('game')
      } else {
        setError(typeof res.error === 'string' ? res.error : 'Failed to join game')
        setMode('lobby')
      }
    })
  }

  const handleSubmitTrack = () => {
    if (!trackUrl) return
    const s = getSocket()
    s.emit('submitTrack', {
      gameId,
      username,
      track: {
        id: `${username}-${Date.now()}`,
        url: trackUrl,
      },
    }, (res: SocketResponse) => {
      if (!res.success) {
        setError(typeof res.error === 'string' ? res.error : 'Failed to submit track')
      } else {
        setTrackUrl('')
      }
    })
  }

  const handleChangeTracksPerPlayer = (tracksPerPlayer: number) => {
    const s = getSocket()
    s.emit('changeGameSetting', { gameId, username, newSettings: { tracksPerPlayer } }, (res: SocketResponse) => {
      if (!res.success) {
        setError(typeof res.error === 'string' ? res.error : 'Failed to change setting')
      }
    })
  }

  const handleStartGame = () => {
    const s = getSocket()
    s.emit('startGame', { gameId, username }, (res: SocketResponse) => {
      if (!res.success) {
        setError(typeof res.error === 'string' ? res.error : 'Failed to start game')
      }
    })
  }

  const handleVote = () => {
    const s = getSocket()
    s.emit('vote', { gameId, username, voteFor: vote }, (res: SocketResponse) => {
      if (!res.success) {
        setError(typeof res.error === 'string' ? res.error : 'Failed to vote')
      }
    })
  }

  const handleRevealResults = () => {
    const s = getSocket()
    s.emit('revealResults', { gameId, username }, (res: SocketResponse) => {
      if (!res.success) {
        setError(typeof res.error === 'string' ? res.error : 'Failed to reveal results')
      }
    })
  }

  const handleNextRound = () => {
    const s = getSocket()
    s.emit('nextRound', { gameId, username }, (res: SocketResponse) => {
      if (!res.success) {
        setError(typeof res.error === 'string' ? res.error : 'Failed to start next round')
      }
    })
  }

  const handleLikeTrack = () => {
    if (!gameState) return
    setLikeLoading(true)
    const s = getSocket()
    s.emit('likeTrack', { gameId, username }, () => {
      setLikeLoading(false)
      // No error UI for now
    })
  }

  const handleReturnToLobby = () => {
    const s = getSocket();
    s.emit('leaveGame', { gameId, username }, (res: SocketResponse) => {
      if (!res.success) {
        console.error('Failed to leave game on backend, but leaving on client anyway');
      }
    });
    localStorage.removeItem('gameId');
    localStorage.removeItem('username');
    setGameId('');
    setUsername('');
    setGameState(null);
    setMode('lobby');
  };

  // Auto-reconnect on mount if gameId and username are in localStorage
  useEffect(() => {
    const savedGameId = localStorage.getItem('gameId')
    const savedUsername = localStorage.getItem('username')
    if (savedGameId && savedUsername) {
      setMode('loading')
      const s = getSocket()
      s.emit('reconnectPlayer', { gameId: savedGameId, username: savedUsername }, (res: { success: boolean }) => {
        if (res.success) {
          setGameId(savedGameId)
          setUsername(savedUsername)
          setMode('game')
        } else {
          setMode('lobby')
        }
      })
    }
  }, [])

  // Sync local vote state with game state
  useEffect(() => {
    if (gameState?.gamePhase === 'RoundInProgress') {
      // Since we don't get the votes object anymore, we can't sync the vote.
      // The server will remember the vote. We can clear our local state
      // when a new round starts.
      if (gameState.currentRoundData?.track.id !== localStorage.getItem('lastVotedTrackId')) {
          setVote('');
          localStorage.setItem('lastVotedTrackId', gameState.currentRoundData?.track.id || '');
      }
    }
  }, [gameState]);

  if (mode === 'loading') {
    return <div>Loading...</div>
  }

  if (mode === 'lobby') {
    return (
      <div className="lobby">
        <h1>Music Guessing Game</h1>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          type="text"
          placeholder="Enter game ID (to join)"
          value={gameId}
          onChange={e => setGameId(e.target.value)}
        />
        <div style={{ margin: '1em 0' }}>
          <button onClick={handleCreateGame} disabled={!username}>
            Create Game
          </button>
          <button onClick={handleJoinGame} disabled={!username || !gameId}>
            Join Game
          </button>
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
      </div>
    )
  }

  // Main game UI for all phases
  if (mode === 'game' && gameState) {
    const me = gameState.players.find(p => p.username === username)
    const isAdmin = me?.isAdmin
    const allReady = gameState.players.every(p => p.ready)

    const renderMyTracks = () => {
        if (me && me.tracks) {
            return <MyTracksList myTracks={me.tracks} playedTrackIds={gameState.playedTrackIds} />;
        }
        return null;
    };

    const renderCurrentPhase = () => {
      // LOBBY PHASE
      if (gameState.gamePhase === 'Lobby') {
        return (
          <div className="game-lobby">
            <h2>Lobby: Game ID {gameState.id}</h2>
            <h3>Players</h3>
            <ul>
              {gameState.players.map((p) => (
                <li key={p.username}>
                  {p.username} {p.isAdmin && '(Admin)'} {p.isConnected ? '' : '(Disconnected)'}
                  {' - '}
                  Tracks: {p.trackCount}/{gameState.gameSettings.tracksPerPlayer}
                  {p.ready ? ' ✅' : ''}
                </li>
              ))}
            </ul>
            <h3>Submit Your Tracks</h3>
            <input
              type="text"
              placeholder="Track URL"
              value={trackUrl}
              onChange={e => setTrackUrl(e.target.value)}
              disabled={me && me.tracks && me.tracks.length >= gameState.gameSettings.tracksPerPlayer}
            />
            <button
              onClick={handleSubmitTrack}
              disabled={!trackUrl || !trackUrl.startsWith('http') || (me && me.tracks && me.tracks.length >= gameState.gameSettings.tracksPerPlayer)}
            >
              Submit Track
            </button>
            {renderMyTracks()}
            {me && me.tracks && me.tracks.length >= gameState.gameSettings.tracksPerPlayer && (
              <div style={{ color: 'green', marginTop: 10 }}>All your tracks submitted! Waiting for others...</div>
            )}
            {me && (!me.tracks || me.tracks.length < gameState.gameSettings.tracksPerPlayer) && error && (
              <div style={{ color: 'red' }}>{error}</div>
            )}
            <div style={{ marginTop: 20 }}>
              <strong>Game Settings:</strong> Tracks per player:
              <input
                type="number"
                min={1}
                value={gameState.gameSettings.tracksPerPlayer}
                onChange={e => isAdmin && handleChangeTracksPerPlayer(Number(e.target.value))}
                style={{ marginLeft: 8, width: 40 }}
                disabled={!isAdmin}
              />
              {isAdmin && (
                <button
                  onClick={handleStartGame}
                  disabled={!allReady}
                  style={{ marginLeft: 8 }}
                >
                  Start Game
                </button>
              )}
            </div>
          </div>
        )
      }
      // ROUND IN PROGRESS
      if (gameState.gamePhase === 'RoundInProgress' && gameState.currentRoundData) {
        const isMyTrack = !!me?.tracks?.some(t => t.id === gameState.currentRoundData?.track.id);
        const hasLiked = !!gameState.currentRoundData.likes?.[username];
        const likeCount = Object.keys(gameState.currentRoundData.likes || {}).length;
        const likers = Object.keys(gameState.currentRoundData.likes || {});

        return (
          <div className="game-round-in-progress">
            <h2>Round in Progress</h2>
            <p>Listen to the track and guess who submitted it!</p>
            <h3>Currently Playing</h3>
            {gameState.currentRoundData?.track?.url ? (
              <TrackPlayer url={gameState.currentRoundData.track.url} />
            ) : <p>Track is loading...</p>}

            <div className="like-section">
              <button onClick={handleLikeTrack} disabled={likeLoading || hasLiked || isMyTrack}>
                {hasLiked ? 'Liked!' : 'Like'}
              </button>
              {gameState.currentRoundData.likes && (
                <>
                  <span>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>
                  {likers.length > 0 && (
                    <span style={{ marginLeft: 8, color: '#888', fontSize: '0.9em' }}>
                      ({likers.join(', ')})
                    </span>
                  )}
                </>
              )}
            </div>
            {/* VOTE */}
            <div style={{ marginTop: 20 }}>
              <strong>Vote for a player:</strong>
              {isMyTrack ? (
                  <div style={{ color: 'blue' }}>This is your track, just enjoy it!</div>
              ) : (
                <>
                  <select value={vote} onChange={e => setVote(e.target.value)}>
                    <option value="">-- Select a player --</option>
                    {gameState.players
                      .filter(p => p.username !== username)
                      .map(p => (
                        <option key={p.username} value={p.username}>
                          {p.username}
                        </option>
                      ))}
                  </select>
                  <button onClick={handleVote} disabled={!vote}>
                    Submit Vote
                  </button>
                </>
              )}
            </div>

            {/* VOTE COUNTER */}
            {gameState.currentRoundData && typeof gameState.currentRoundData.votesCast === 'number' && typeof gameState.currentRoundData.totalVoters === 'number' && (
              <div className="vote-counter" style={{ marginTop: '1em', fontWeight: 'bold' }}>
                Votes: {gameState.currentRoundData.votesCast} / {gameState.currentRoundData.totalVoters}
              </div>
            )}

            {renderMyTracks()}
          </div>
        )
      }
      // VOTES TALLIED
      if (gameState.gamePhase === 'VotesTallied') {
        return (
          <div className="game-votes-tallied">
            <h2>Votes are in!</h2>
            <p>All eligible players have voted.</p>
            {isAdmin && (
              <button onClick={handleRevealResults}>Reveal Results</button>
            )}
            {!isAdmin && <p>Waiting for admin to reveal results...</p>}
            {renderMyTracks()}
          </div>
        )
      }
      // ROUND RESULTS
      if (gameState.gamePhase === 'RoundResults' && gameState.currentRoundData && gameState.currentRoundData.results) {
        const { results } = gameState.currentRoundData
        const isLastRound = gameState.playedTrackIds.length === gameState.players.reduce((acc, p) => acc + p.trackCount, 0);
        return (
          <div className="game-round-results">
            <h2>Round Results</h2>
            <p>
              The song was submitted by <strong>{results.correctOwner}</strong>
            </p>
            <h3>Votes</h3>
            <ul>
              {results.votes.map(v => (
                <li key={v.voter}>
                  {v.voter} guessed {v.guessed} - {v.correct ? '✅' : '❌'}
                </li>
              ))}
            </ul>
            <h3>Likes</h3>
            <div>
              {results.likeCount || 0} {results.likeCount === 1 ? 'like' : 'likes'}
              {results.likers && results.likers.length > 0 && (
                <span style={{ marginLeft: 8, color: '#888', fontSize: '0.9em' }}>
                  ({results.likers.join(', ')})
                </span>
              )}
            </div>
            <h3>Points Awarded</h3>
            <ul>
              {Object.entries(results.pointsAwarded).map(([user, points]) => (
                <li key={user}>
                  {user}: +{points}
                </li>
              ))}
            </ul>
            {isAdmin && (
              <button onClick={handleNextRound}>{isLastRound ? 'Finish Game' : 'Next Round'}</button>
            )}
            {!isAdmin && <p>Waiting for admin to start the next round...</p>}
            <PlayedTracksList playedTracks={gameState.playedTracks} />
            {renderMyTracks()}
          </div>
        )
      }
      // AWAITING NEXT ROUND
      if (gameState.gamePhase === 'AwaitingNextRound') {
        return (
          <div className="awaiting-next-round">
            <h2>Awaiting Next Round</h2>
            {isAdmin ? (
              <button onClick={handleNextRound}>Next Round</button>
            ) : (
              <div>Waiting for admin to start the next round...</div>
            )}
          </div>
        )
      }
      // GAME FINISHED
      if (gameState.gamePhase === 'GameFinished') {
        // Most Liked Leaderboard
        const likeLeaderboard = Object.values(gameState.players).map(p => ({
          username: p.username,
          likeCount: gameState.playedTracks.filter(pt => pt.ownerUsername === p.username).reduce((acc, pt) => acc + (pt.likes?.length || 0), 0)
        })).sort((a, b) => b.likeCount - a.likeCount)

        return (
          <div className="game-finished">
            <h2>Game Over!</h2>
            <h3>Final Leaderboard</h3>
            <ul>
              {gameState.leaderboard.sort((a, b) => b.points - a.points).map(p => (
                <li key={p.username}>
                  {p.username}: {p.points} points
                </li>
              ))}
            </ul>
            <h3>Most Liked Songs Leaderboard</h3>
            <ul>
              {likeLeaderboard.map(entry => (
                <li key={entry.username}>
                  {entry.username}: {entry.likeCount} {entry.likeCount === 1 ? 'like' : 'likes'}
                </li>
              ))}
            </ul>
            <PlayedTracksList playedTracks={gameState.playedTracks} />
            {renderMyTracks()}
          </div>
        )
      }
      // Fallback
      return (
        <div>
          Game UI goes here
          <pre>{JSON.stringify({ mode, gameState }, null, 2)}</pre>
        </div>
      )
    }

    return (
      <div className="game-container">
        <header className="game-header-bar">
          <div>
            <strong>Game:</strong> {gameState.id} | <strong>Player:</strong> {username}
          </div>
          <button onClick={handleReturnToLobby}>Exit to Lobby</button>
        </header>
        <div className="game-phase-content">
          {renderCurrentPhase()}
        </div>
      </div>
    );
  }

  // Fallback: If in game mode but no gameState, show the lobby screen
  if (mode === 'game') {
    return (
      <div className="lobby">
        <h1>Music Guessing Game</h1>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          type="text"
          placeholder="Enter game ID (to join)"
          value={gameId}
          onChange={e => setGameId(e.target.value)}
        />
        <div style={{ margin: '1em 0' }}>
          <button onClick={handleCreateGame} disabled={!username}>
            Create Game
          </button>
          <button onClick={handleJoinGame} disabled={!username || !gameId}>
            Join Game
          </button>
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
      </div>
    )
  }
  // Fallback
  return <div>Game UI goes here</div>
}

export default App
