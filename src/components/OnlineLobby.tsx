/**
 * OnlineLobby.tsx
 * Composant de Lobby pour le jeu en ligne de RasRas.
 * Gère la connexion Socket.io, la création/jointure de salons,
 * et la sélection synchronisée des personnages entre les deux joueurs.
 */

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Swords, User, Users, Globe, Play } from 'lucide-react';
import { soundManager } from '../game/SoundManager';
import { CHARACTERS, type Character } from './CharacterSelection';

interface OnlineLobbyProps {
  onBack: () => void;
  onGameStart: (socket: Socket, role: 'host' | 'client', p1Char: Character, p2Char: Character, roomCode: string) => void;
}

type LobbyState = 'username' | 'menu' | 'waiting' | 'selection';

export const OnlineLobby: React.FC<OnlineLobbyProps> = ({ onBack, onGameStart }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lobbyState, setLobbyState] = useState<LobbyState>('username');
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [currentRoomCode, setCurrentRoomCode] = useState('');
  const roomCodeRef = useRef('');
  const [serverUrl, setServerUrl] = useState(() => {
    const saved = localStorage.getItem('rasras_server_url');
    if (saved) return saved;
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    return '';
  });

  const updateRoomCode = (code: string) => {
    setCurrentRoomCode(code);
    roomCodeRef.current = code;
  };
  const [errorMsg, setErrorMsg] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Données de salon synchronisées
  const [p1Name, setP1Name] = useState('');
  const [p2Name, setP2Name] = useState('');
  
  // États de sélection des combattants
  const [localChar, setLocalChar] = useState<Character | null>(null);
  const [localReady, setLocalReady] = useState(false);
  const [opponentChar, setOpponentChar] = useState<Character | null>(null);
  const [opponentReady, setOpponentReady] = useState(false);

  // Initialisation et connexion Socket.io
  const connectToServer = () => {
    setConnecting(true);
    setErrorMsg('');

    // Détecter l'adresse de connexion en développement vs production
    let socketUrl = serverUrl.trim();
    if (!socketUrl) {
      // Détection automatique s'il s'agit d'itch.io ou non
      const isItch = window.location.hostname.includes('itch.io') || window.location.hostname.includes('hwcdn.net');
      socketUrl = isItch ? 'https://rasras-server.onrender.com' : window.location.origin;
    }

    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      upgrade: false
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connecté au serveur : ' + socketUrl);
      setSocket(newSocket);
      setConnecting(false);
      setLobbyState('menu');
      localStorage.setItem('rasras_server_url', serverUrl); // Mémoriser l'URL entrée par l'utilisateur
      soundManager.play('cheer', { volumeScale: 0.15 });
    });

    newSocket.on('connect_error', () => {
      setConnecting(false);
      setErrorMsg(`Impossible de se connecter au serveur à l'adresse : ${socketUrl}`);
      newSocket.close();
    });

    // Gestion des réponses de salon
    newSocket.on('room_created', (data: { roomCode: string; playerName: string }) => {
      updateRoomCode(data.roomCode);
      setP1Name(data.playerName);
      setP2Name('En attente...');
      setLobbyState('waiting');
      soundManager.play('countdown', { volumeScale: 0.25 });
    });

    newSocket.on('room_ready', (data: { roomCode: string; p1Name: string; p2Name: string }) => {
      updateRoomCode(data.roomCode);
      setP1Name(data.p1Name);
      setP2Name(data.p2Name);
      setLobbyState('selection');
      soundManager.play('fight');
    });

    newSocket.on('join_error', (data: { message: string }) => {
      setErrorMsg(data.message);
    });

    newSocket.on('opponent_character_update', (data: { character: Character | null; isReady: boolean }) => {
      setOpponentChar(data.character);
      setOpponentReady(data.isReady);
      if (data.isReady) {
        soundManager.play('block', { volumeScale: 0.5 });
      }
    });

    newSocket.on('opponent_left', (data: { message: string }) => {
      alert(data.message);
      // Réinitialiser vers le menu du lobby
      setLobbyState('menu');
      updateRoomCode('');
      setLocalChar(null);
      setLocalReady(false);
      setOpponentChar(null);
      setOpponentReady(false);
    });

    newSocket.on('start_match', (data: { p1Char: Character; p2Char: Character; p1Id: string; p2Id: string }) => {
      soundManager.play('fight');
      // Déterminer le rôle exact pour le combat
      const finalRole = newSocket.id === data.p1Id ? 'host' : 'client';
      onGameStart(newSocket, finalRole, data.p1Char, data.p2Char, roomCodeRef.current);
    });
  };

  useEffect(() => {
    // Le socket n'est pas déconnecté ici car son cycle de vie est transféré
    // à l'application parente App.tsx (pour le combat).
    // La déconnexion sera gérée lors du retour au menu.
    return () => {};
  }, [socket]);

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    connectToServer();
  };

  const handleCreateRoom = () => {
    if (!socket) return;
    setErrorMsg('');
    socket.emit('create_room', { playerName });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !roomCodeInput.trim()) return;
    setErrorMsg('');
    socket.emit('join_room', { roomCode: roomCodeInput.trim(), playerName });
  };

  const handleSelectCharacter = (char: Character) => {
    if (localReady || !socket) return;
    soundManager.play('punch', { pitchVariation: 0.1 });
    
    setLocalChar(char);
    
    // Notifier le serveur
    socket.emit('character_select', {
      roomCode: currentRoomCode,
      character: char,
      isReady: false
    });
  };

  const handleToggleReady = () => {
    if (!localChar || !socket) return;
    const newReadyState = !localReady;
    setLocalReady(newReadyState);
    
    soundManager.play('fight', { pitchVariation: 0.05 });

    socket.emit('character_select', {
      roomCode: currentRoomCode,
      character: localChar,
      isReady: newReadyState
    });
  };

  const playHoverSound = () => {
    soundManager.play('countdown', { volumeScale: 0.15, pitchVariation: 0.05 });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white px-4 relative overflow-hidden bg-slate-950" style={{ backgroundImage: 'radial-gradient(circle at top, var(--bg-purple-950) 0%, var(--bg-slate-950) 100%)' }}>
      
      {/* Grille animée en fond */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{ 
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '40px 40px' 
        }} 
      />

      {/* Titre */}
      <div className="text-center mb-8 relative z-10">
        <h1 
          className="text-5xl font-black uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-yellow-500"
          style={{ filter: 'drop-shadow(0 0 25px rgba(239,68,68,0.4))', WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text' }}
        >
          Combat En Ligne
        </h1>
        <p className="text-zinc-400 text-xs font-semibold tracking-widest uppercase mt-1">Lobby Multijoueur</p>
      </div>

      {/* 1. ÉCRAN SAISIE PSEUDO */}
      {lobbyState === 'username' && (
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-950-60 border border-white-10 backdrop-blur-xl shadow-box-menu relative z-10 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <User size={36} className="text-pink-500" />
            <h2 className="text-lg font-black uppercase tracking-wider">Configurez votre Combattant</h2>
          </div>
          <form onSubmit={handleUsernameSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-10px font-bold uppercase tracking-wider text-zinc-400">Votre Pseudo</label>
              <input
                type="text"
                maxLength={15}
                required
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ex: Samir"
                className="py-3.5 px-4 rounded-xl bg-white-5 border border-white-10 text-white font-bold text-sm tracking-wide focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-10px font-bold uppercase tracking-wider text-zinc-400">Adresse du serveur de jeu</label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="Ex: https://rasras-server.onrender.com"
                className="py-3.5 px-4 rounded-xl bg-white-5 border border-white-10 text-white font-mono text-xs focus:outline-none focus:border-pink-500 transition-colors"
              />
              <span className="text-[9px] text-zinc-400 leading-tight">
                Laissez vide pour l'adresse automatique (https://rasras-server.onrender.com).
              </span>
            </div>

            {errorMsg && <p className="text-xs font-bold text-red-400 bg-red-500-10 border border-red-500-20 px-3 py-2 rounded-lg text-center">{errorMsg}</p>}
            <button
              type="submit"
              disabled={connecting}
              onMouseEnter={playHoverSound}
              className="py-4 px-6 rounded-xl text-white font-black text-sm uppercase tracking-wider transition-all duration-300 hover-scale-102 active-scale-98 flex items-center justify-center gap-2 border border-white-10"
              style={{
                background: 'linear-gradient(to right, var(--pink-500), var(--red-500))',
                boxShadow: '0 8px 24px rgba(239,68,68,0.3)'
              }}
            >
              {connecting ? 'Connexion en cours...' : 'Se connecter au serveur'}
            </button>
          </form>
          <button onClick={onBack} className="text-xs text-zinc-500 hover:text-white transition-colors text-center uppercase tracking-wider font-bold">Retour au menu</button>
        </div>
      )}

      {/* 2. ÉCRAN CHOIX CRÉATION/REJOINDRE */}
      {lobbyState === 'menu' && (
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-950-60 border border-white-10 backdrop-blur-xl shadow-box-menu relative z-10 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white-5 pb-3">
            <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Joueur : <strong className="text-pink-400">{playerName}</strong></span>
            <button 
              onClick={() => { socket?.disconnect(); setLobbyState('username'); }}
              className="text-10px text-zinc-500 hover:text-white transition-colors font-bold uppercase tracking-wider"
            >
              Déconnecter
            </button>
          </div>

          <div className="flex flex-col gap-6">
            {/* Créer un salon */}
            <div className="flex flex-col gap-2">
              <span className="text-10px font-bold uppercase tracking-wider text-pink-400">Option 1</span>
              <button
                onClick={handleCreateRoom}
                onMouseEnter={playHoverSound}
                className="py-4 px-6 rounded-2xl bg-white-5 border border-white-10 hover:border-pink-500-50 text-white font-black text-sm uppercase tracking-wider transition-all duration-300 hover-scale-102 active-scale-98 flex items-center justify-center gap-2"
              >
                <Users size={16} />
                Créer un salon privé
              </button>
            </div>

            {/* Séparateur */}
            <div className="flex items-center gap-4 text-zinc-600 text-xs font-bold uppercase tracking-widest my-1">
              <div className="flex-1 h-px bg-white-5" />
              <span>OU</span>
              <div className="flex-1 h-px bg-white-5" />
            </div>

            {/* Rejoindre un salon */}
            <form onSubmit={handleJoinRoom} className="flex flex-col gap-3">
              <span className="text-10px font-bold uppercase tracking-wider text-pink-400">Option 2</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.replace(/\D/g, ''))} // Chiffres uniquement
                  placeholder="Code à 4 chiffres"
                  className="flex-1 py-3.5 px-4 rounded-xl bg-white-5 border border-white-10 text-white font-mono font-bold text-center tracking-widest focus:outline-none focus:border-pink-500 transition-colors"
                />
                <button
                  type="submit"
                  onMouseEnter={playHoverSound}
                  className="py-3.5 px-6 rounded-xl text-white font-black text-sm uppercase tracking-wider transition-all duration-200 hover:bg-slate-800 border border-white-10"
                  style={{ background: 'linear-gradient(to right, var(--pink-600), var(--red-600))' }}
                >
                  Rejoindre
                </button>
              </div>
            </form>

            {errorMsg && <p className="text-xs font-bold text-red-400 bg-red-500-10 border border-red-500-20 px-3 py-2 rounded-lg text-center animate-shake">{errorMsg}</p>}
          </div>

          <button onClick={() => { socket?.disconnect(); onBack(); }} className="text-xs text-zinc-500 hover:text-white transition-colors text-center uppercase tracking-wider font-bold border-t border-white-5 pt-3 mt-1">Retour au menu</button>
        </div>
      )}

      {/* 3. ÉCRAN ATTENTE J2 */}
      {lobbyState === 'waiting' && (
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-950-60 border border-white-10 backdrop-blur-xl shadow-box-menu relative z-10 flex flex-col gap-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full border-3 border-pink-500-30 flex items-center justify-center bg-slate-950-80 shadow-glow-pink animate-pulse">
              <Globe size={28} className="text-pink-500 animate-spin-slow" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-wider">Salon Créé</h2>
          </div>

          <div className="bg-black-30 p-6 rounded-2xl border border-white-5 flex flex-col gap-2">
            <span className="text-10px font-bold uppercase tracking-wider text-zinc-400">Code du salon à partager</span>
            <span className="text-5xl font-mono font-black text-pink-400 tracking-widest">{currentRoomCode}</span>
          </div>

          <div className="text-xs text-zinc-400 font-semibold uppercase flex flex-col gap-2 border-t border-b border-white-5 py-4">
            <div className="flex justify-between items-center"><span className="text-zinc-500">Joueur 1 (Hôte) :</span> <span className="font-bold text-white">{p1Name}</span></div>
            <div className="flex justify-between items-center"><span className="text-zinc-500">Joueur 2 :</span> <span className="font-bold text-pink-400 animate-pulse">{p2Name}</span></div>
          </div>

          <button 
            onClick={() => { socket?.emit('leave_room'); setLobbyState('menu'); }}
            className="py-3 px-6 rounded-xl border border-white-10 hover:bg-white-5 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-all"
          >
            Annuler et quitter
          </button>
        </div>
      )}

      {/* 4. ÉCRAN SÉLECTION DES PERSONNAGES */}
      {lobbyState === 'selection' && (
        <div className="w-full max-w-5xl relative z-10 flex flex-col gap-6 animate-fade-in">
          {/* Header de salon */}
          <div className="flex justify-between items-center bg-slate-950-60 border border-white-10 p-4 rounded-2xl backdrop-blur-md">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Salon privé : <strong className="text-pink-400 font-mono">{currentRoomCode}</strong></span>
            <div className="flex items-center gap-4 text-xs font-black uppercase tracking-wider">
              <span className={localReady ? 'text-emerald-400' : 'text-zinc-500'}>{p1Name} {localReady && '✓ READY'}</span>
              <span className="text-zinc-600">VS</span>
              <span className={opponentReady ? 'text-emerald-400' : 'text-zinc-500'}>{p2Name} {opponentReady && '✓ READY'}</span>
            </div>
            <button 
              onClick={() => { socket?.emit('leave_room'); setLobbyState('menu'); }}
              className="py-1.5 px-3 rounded-lg border border-white-5 hover:bg-red-500-20 hover:border-red-500-30 text-zinc-400 hover:text-white transition-all text-10px font-bold uppercase tracking-wider"
            >
              Quitter
            </button>
          </div>

          {/* Grille de sélection des personnages */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {CHARACTERS.map((char) => {
              const isSelectedLocal = localChar?.id === char.id;
              const isSelectedOpponent = opponentChar?.id === char.id;

              return (
                <div
                  key={char.id}
                  onClick={() => handleSelectCharacter(char)}
                  onMouseEnter={playHoverSound}
                  className={`group cursor-pointer rounded-2xl p-4 border backdrop-blur-md transition-all duration-300 transform flex flex-col justify-between relative overflow-hidden ${
                    isSelectedLocal
                      ? 'bg-pink-950-20 border-pink-500 scale-[1.02]'
                      : 'bg-slate-950-50 border-white-10 hover:border-pink-500-50'
                  }`}
                  style={isSelectedLocal ? {
                    boxShadow: '0 0 20px rgba(219,39,119,0.25)'
                  } : {}}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                    style={{ background: `radial-gradient(circle at center, ${char.colorHex} 0%, transparent 70%)` }}
                  />

                  {/* Tête de combattant en CSS réduite */}
                  <div className="flex justify-center items-center py-3">
                    <div
                      className="w-16 h-16 rounded-full border-2 border-zinc-950 relative transition-transform duration-300 group-hover:scale-105 flex items-center justify-center"
                      style={{ backgroundColor: char.colorHex }}
                    >
                      <div className="absolute top-[35%] left-[20%] w-3.5 h-3.5 rounded-full bg-white border border-black flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 translate-x-1px translate-y-1px" />
                      </div>
                      <div className="absolute top-[35%] right-[20%] w-3.5 h-3.5 rounded-full bg-white border border-black flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 translate-x-1px translate-y-1px" />
                      </div>
                      <div className="absolute bottom-[-3px] left-[-8px] w-5.5 h-5.5 rounded-full border-2 border-zinc-950" style={{ backgroundColor: char.gloveColorHex }} />
                      <div className="absolute bottom-[-3px] right-[-8px] w-5.5 h-5.5 rounded-full border-2 border-zinc-950" style={{ backgroundColor: char.gloveColorHex }} />
                    </div>
                  </div>

                  {/* Contenu textuel et statistiques en ligne */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-black uppercase text-center text-white tracking-tight">
                      {char.name}
                    </h3>

                    {/* Statistiques en ligne */}
                    <div className="grid grid-cols-4 gap-1 bg-black-30 p-2 rounded-xl border border-white-5 text-[9px] font-bold text-center text-zinc-300 font-mono">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="text-red-500 font-mono">{char.maxHp}</span>
                        <span className="text-[7px] text-zinc-500 uppercase font-sans">HP</span>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-0.5 border-l border-white-5">
                        <span className="text-cyan-400 font-mono">{char.speed.toFixed(1)}</span>
                        <span className="text-[7px] text-zinc-500 uppercase font-sans">SPD</span>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-0.5 border-l border-white-5">
                        <span className="text-orange-500 font-mono">{char.power}</span>
                        <span className="text-[7px] text-zinc-500 uppercase font-sans">PWR</span>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-0.5 border-l border-white-5">
                        <span className="text-emerald-400 font-mono">{char.defense}</span>
                        <span className="text-[7px] text-zinc-500 uppercase font-sans">DEF</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges de sélection */}
                  <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end">
                    {isSelectedLocal && (
                      <div className="bg-pink-600 border border-pink-400 text-white font-bold text-[8px] uppercase px-2 py-0.5 rounded-full shadow-md">
                        Moi {localReady ? '✓ READY' : ''}
                      </div>
                    )}
                    {isSelectedOpponent && (
                      <div className="bg-cyan-600 border border-cyan-400 text-white font-bold text-[8px] uppercase px-2 py-0.5 rounded-full shadow-md">
                        Adversaire {opponentReady ? '✓ READY' : ''}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bouton Prêt */}
          {localChar && (
            <button
              onClick={handleToggleReady}
              className={`w-full py-5 rounded-2xl text-white font-black text-lg uppercase tracking-widest transition-all duration-300 hover-scale-102 active-scale-98 flex items-center justify-center gap-3 border border-white-10 mt-4 ${
                localReady 
                  ? 'border-emerald-500 text-emerald-400' 
                  : 'border-pink-500 text-pink-400'
              }`}
              style={{
                background: localReady 
                  ? 'rgba(16,185,129,0.15)' 
                  : 'linear-gradient(to right, var(--pink-600), var(--red-600))',
                boxShadow: localReady 
                  ? '0 0 20px rgba(16,185,129,0.2)' 
                  : '0 10px 30px rgba(239,68,68,0.3)'
              }}
            >
              {localReady ? <Play size={20} className="text-emerald-400" /> : <Swords size={20} />}
              {localReady ? 'Prêt ! En attente de l\'adversaire...' : 'Marquer comme Prêt'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
