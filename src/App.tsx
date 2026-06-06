/**
 * App.tsx
 * Composant racine de l'application RasRas.
 * Gère le routage interne des écrans (Menu -> Sélection -> Jeu -> Fin de match)
 * et stocke l'état global de la partie.
 */

import { useState, useEffect, useRef } from 'react';
import { MainMenu } from './components/MainMenu';
import { CharacterSelection } from './components/CharacterSelection';
import type { Character } from './components/CharacterSelection';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { GameOver } from './components/GameOver';
import { OnlineLobby } from './components/OnlineLobby';
import { Socket } from 'socket.io-client';
import { Volume2, VolumeX, Gamepad } from 'lucide-react';
import { soundManager } from './game/SoundManager';
import { inputManager } from './game/Input';

type GameScreen = 'menu' | 'selection' | 'game' | 'gameover' | 'lobby';

function App() {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [gameMode, setGameMode] = useState<'solo' | 'versus' | 'online'>('solo');
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  
  // États multijoueur en ligne
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineRole, setOnlineRole] = useState<'host' | 'client' | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  
  // Personnages sélectionnés
  const [p1Char, setP1Char] = useState<Character | null>(null);
  const [p2Char, setP2Char] = useState<Character | null>(null);

  // Statistiques en direct du combat (remontées par le Canvas PixiJS)
  const [liveData, setLiveData] = useState({
    p1Hp: 100,
    p2Hp: 100,
    p1Rage: 0,
    p2Rage: 0,
    p1Combo: 0,
    p2Combo: 0,
    gameTime: 99,
    isKO: false,
  });

  const [isPaused, setIsPaused] = useState(false);
  const [winnerName, setWinnerName] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // États pour les contrôles tactiles mobiles
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [joystickOffset, setJoystickOffset] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const joystickStartPos = useRef({ x: 0, y: 0 });
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    // Détection automatique du support tactile
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setShowMobileControls(isTouch);

    // Détection et écoute de l'orientation de l'écran
    const handleOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    handleOrientation();

    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, []);

  const updateJoystickPosition = (dx: number, dy: number) => {
    const maxRadius = 35; // Rayon max de déplacement du stick
    const distance = Math.hypot(dx, dy);
    
    let targetX = dx;
    let targetY = dy;
    
    if (distance > maxRadius) {
      const angle = Math.atan2(dy, dx);
      targetX = Math.cos(angle) * maxRadius;
      targetY = Math.sin(angle) * maxRadius;
    }
    
    setJoystickOffset({ x: targetX, y: targetY });
    
    // Seuil de détection (deadzone) pour activer les directions virtuelles
    const deadzone = 10;
    inputManager.virtualInputs.left = targetX < -deadzone;
    inputManager.virtualInputs.right = targetX > deadzone;
    inputManager.virtualInputs.up = targetY < -deadzone;
    inputManager.virtualInputs.down = targetY > deadzone;
  };

  const handleJoystickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsJoystickActive(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    joystickStartPos.current = { x: centerX, y: centerY };
    
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    updateJoystickPosition(dx, dy);
    
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleJoystickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isJoystickActive) return;
    const dx = e.clientX - joystickStartPos.current.x;
    const dy = e.clientY - joystickStartPos.current.y;
    updateJoystickPosition(dx, dy);
  };

  const handleJoystickUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsJoystickActive(false);
    setJoystickOffset({ x: 0, y: 0 });
    
    inputManager.virtualInputs.left = false;
    inputManager.virtualInputs.right = false;
    inputManager.virtualInputs.up = false;
    inputManager.virtualInputs.down = false;
    
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  // Initialise le jeu après sélection du mode
  const handleStartGame = (mode: 'solo' | 'versus' | 'online', diff: 'easy' | 'normal' | 'hard') => {
    setGameMode(mode);
    setDifficulty(diff);
    if (mode === 'online') {
      setScreen('lobby');
    } else {
      setScreen('selection');
    }
  };

  // Lance le combat après sélection des personnages
  const handleCharactersSelected = (p1: Character, p2: Character) => {
    setP1Char(p1);
    setP2Char(p2);
    
    // Initialiser les stats de départ
    setLiveData({
      p1Hp: p1.maxHp,
      p2Hp: p2.maxHp,
      p1Rage: 0,
      p2Rage: 0,
      p1Combo: 0,
      p2Combo: 0,
      gameTime: 99,
      isKO: false,
    });
    
    setIsPaused(false);
    setScreen('game');
  };

  // Lance le combat en ligne
  const handleOnlineGameStart = (gameSocket: Socket, role: 'host' | 'client', p1: Character, p2: Character, room: string) => {
    setSocket(gameSocket);
    setOnlineRole(role);
    setRoomCode(room);
    setP1Char(p1);
    setP2Char(p2);
    
    setLiveData({
      p1Hp: p1.maxHp,
      p2Hp: p2.maxHp,
      p1Rage: 0,
      p2Rage: 0,
      p1Combo: 0,
      p2Combo: 0,
      gameTime: 99,
      isKO: false,
    });
    
    setIsPaused(false);
    setScreen('game');
  };

  // Fin de partie
  const handleGameOver = (winner: string) => {
    setWinnerName(winner);
    setScreen('gameover');
  };

  // Rejouer le match
  const handleRestart = () => {
    if (gameMode === 'online') {
      setScreen('lobby');
      setP1Char(null);
      setP2Char(null);
      setOnlineRole(null);
    } else if (p1Char && p2Char) {
      handleCharactersSelected(p1Char, p2Char);
    }
  };

  // Retour au menu principal
  const handleHome = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setP1Char(null);
    setP2Char(null);
    setOnlineRole(null);
    setScreen('menu');
  };

  // Activer/Désactiver le son
  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    soundManager.init();
    if (soundEnabled) {
      soundManager.stopBGM();
    } else {
      soundManager.playBGM();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans flex flex-col justify-between text-white relative select-none">
      
      {/* Barre de contrôle utilitaire en haut à droite (Sons / Aide / Tactile) */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-50 pointer-events-auto">
        <button
          onClick={() => setShowMobileControls(!showMobileControls)}
          className={`p-2-5 rounded-full border transition-all duration-200 shadow-md flex items-center justify-center ${showMobileControls ? 'bg-pink-600 border-pink-500 text-white' : 'bg-slate-900-60 border-white-10 text-zinc-400 hover:text-white hover:bg-slate-800'}`}
          title="Contrôles tactiles (Mobile)"
          style={{ width: '38px', height: '38px' }}
        >
          <Gamepad size={16} />
        </button>
        <button
          onClick={toggleSound}
          className="p-2-5 rounded-full bg-slate-900-60 border border-white-10 hover:bg-slate-800 text-zinc-400 hover:text-white transition-all duration-200 shadow-md flex items-center justify-center"
          title={soundEnabled ? 'Couper le son' : 'Activer le son'}
          style={{ width: '38px', height: '38px' }}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      {/* RENDER DES DIFFÉRENTS ÉCRANS */}
      {screen === 'menu' && (
        <MainMenu onStartGame={handleStartGame} />
      )}

      {screen === 'selection' && (
        <CharacterSelection
          gameMode={gameMode as 'solo' | 'versus'}
          onBack={handleHome}
          onCharactersSelected={handleCharactersSelected}
        />
      )}

      {screen === 'game' && p1Char && p2Char && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 py-8 relative overflow-hidden bg-slate-950">
          {/* Grille de fond en style CSS */}
          <div className="absolute inset-0 bg-slate-950 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(120,50,200,0.15) 0%, transparent 80%)' }} />

          {/* En-tête informatif */}
          <div className="text-center mb-4 relative z-10 flex flex-col items-center">
            <h2 className="text-xl font-black uppercase tracking-widest text-pink-400" style={{ filter: 'drop-shadow(0 0 10px rgba(219,39,119,0.3))' }}>
              {gameMode === 'solo' ? 'Combat Solo' : gameMode === 'versus' ? 'Confrontation Locale' : 'Arène En Ligne'}
            </h2>
            {gameMode === 'solo' && (
              <span className="text-10px font-bold text-zinc-500 uppercase tracking-widest bg-white-5 border border-white-5 px-2 py-1 rounded mt-1">
                IA : {difficulty === 'easy' ? 'Facile' : difficulty === 'normal' ? 'Normal' : 'Difficile'}
              </span>
            )}
            {gameMode === 'online' && (
              <span className="text-10px font-bold text-pink-400 uppercase tracking-widest bg-white-5 border border-pink-500-20 px-2 py-1 rounded mt-1">
                Rôle : {onlineRole === 'host' ? 'Créateur (Hôte)' : 'Invité (Client)'}
              </span>
            )}
          </div>

          {/* Arène de jeu principale */}
          <div 
            className="relative rounded-2xl overflow-hidden bg-slate-950 border border-white-10 shadow-box-over w-full"
            style={{ maxWidth: '800px', aspectRatio: '800 / 550' }}
          >
            {/* Canvas PixiJS de combat */}
            <GameCanvas
              gameMode={gameMode}
              difficulty={difficulty}
              player1Character={p1Char}
              player2Character={p2Char}
              onGameDataUpdate={setLiveData}
              onGameOver={handleGameOver}
              isPaused={isPaused}
              socket={socket}
              onlineRole={onlineRole}
              roomCode={roomCode}
            />

            {/* Overlay d'effet KO "KIIIIW" de Street Fighter */}
            {liveData.isKO && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ko-flash-bg" style={{ zIndex: 900 }}>
                <div className="animate-ko-bounce-text select-none">
                  <h1 className="ko-text-kiw">KIIIIW</h1>
                </div>
              </div>
            )}

            {/* Overlay d'interface utilisateur (HUD) */}
            <div className="hud-container">
              <HUD
                p1Name={p1Char.name}
                p2Name={p2Char.name}
                p1ColorHex={p1Char.colorHex}
                p2ColorHex={p2Char.colorHex}
                p1MaxHp={p1Char.maxHp}
                p2MaxHp={p2Char.maxHp}
                p1Hp={liveData.p1Hp}
                p2Hp={liveData.p2Hp}
                p1Rage={liveData.p1Rage}
                p2Rage={liveData.p2Rage}
                p1Combo={liveData.p1Combo}
                p2Combo={liveData.p2Combo}
                gameTime={liveData.gameTime}
                isPaused={isPaused}
                onTogglePause={() => setIsPaused(!isPaused)}
              />
            </div>

            {/* Overlay d'écran de Pause */}
            {isPaused && (
              <div className="absolute inset-0 bg-slate-950-80 backdrop-blur-sm flex flex-col items-center justify-center z-40 animate-fade-in pointer-events-auto">
                <h3 className="text-5xl font-black uppercase tracking-widest text-pink-500 mb-6" style={{ filter: 'drop-shadow(0 0 15px rgba(219,39,119,0.5))' }}>
                  PAUSE
                </h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsPaused(false)}
                    className="py-3 px-6 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-sm uppercase tracking-wider transition-all duration-200"
                  >
                    Reprendre
                  </button>
                  <button
                    onClick={handleHome}
                    className="py-3 px-6 rounded-xl bg-white-5 border border-white-10 hover:bg-white-10 text-zinc-300 font-bold text-sm uppercase tracking-wider transition-all duration-200"
                  >
                    Menu Principal
                  </button>
                </div>
              </div>
            )}

            {/* Overlay des contrôles tactiles mobiles transparents aux extrémités de l'arène */}
            {showMobileControls && (
              <div 
                className="absolute inset-0 pointer-events-none select-none flex justify-between items-end p-4 pb-6"
                style={{ zIndex: 50, touchAction: 'none' }}
              >
                {/* Stick directionnel à gauche */}
                <div 
                  className="pointer-events-auto flex items-center justify-center w-24 h-24 relative ml-2 opacity-50 active:opacity-90 transition-opacity duration-150"
                  style={{ touchAction: 'none' }}
                >
                  <div 
                    className="w-20 h-20 rounded-full bg-slate-900/30 border border-white/20 flex items-center justify-center relative touch-none shadow-md"
                    style={{
                      boxShadow: '0 0 10px rgba(255,255,255,0.03), inset 0 0 8px rgba(0,0,0,0.6)',
                      touchAction: 'none'
                    }}
                    onPointerDown={handleJoystickDown}
                    onPointerMove={handleJoystickMove}
                    onPointerUp={handleJoystickUp}
                    onPointerLeave={handleJoystickUp}
                  >
                    <div 
                      className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-red-500 absolute cursor-pointer"
                      style={{
                        transform: `translate(${joystickOffset.x}px, ${joystickOffset.y}px)`,
                        boxShadow: '0 0 10px #ec4899',
                        transition: isJoystickActive ? 'none' : 'transform 0.15s ease-out',
                        touchAction: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Boutons d'action à droite */}
                <div 
                  className="pointer-events-auto flex gap-3 items-end pb-1 mr-2 opacity-60 active:opacity-100 transition-opacity duration-150"
                  style={{ touchAction: 'none' }}
                >
                  {/* Parade */}
                  <button
                    className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center active:bg-yellow-500/40 text-yellow-400/80 font-black text-[10px] uppercase tracking-wider shadow-sm select-none touch-none transition-transform active:scale-90"
                    style={{
                      boxShadow: '0 0 8px rgba(234, 179, 8, 0.1)',
                      backdropFilter: 'blur(2px)',
                      WebkitBackdropFilter: 'blur(2px)',
                      touchAction: 'none'
                    }}
                    onPointerDown={() => { inputManager.virtualInputs.block = true; }}
                    onPointerUp={() => { inputManager.virtualInputs.block = false; }}
                    onPointerLeave={() => { inputManager.virtualInputs.block = false; }}
                  >
                    Parer
                  </button>

                  {/* Esquive */}
                  <button
                    className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center active:bg-cyan-500/40 text-cyan-400/80 font-black text-[10px] uppercase tracking-wider shadow-sm select-none touch-none transition-transform active:scale-90"
                    style={{
                      boxShadow: '0 0 8px rgba(34, 211, 238, 0.1)',
                      backdropFilter: 'blur(2px)',
                      WebkitBackdropFilter: 'blur(2px)',
                      touchAction: 'none'
                    }}
                    onPointerDown={() => { inputManager.virtualInputs.dash = true; }}
                    onPointerUp={() => { inputManager.virtualInputs.dash = false; }}
                    onPointerLeave={() => { inputManager.virtualInputs.dash = false; }}
                  >
                    Dash
                  </button>

                  {/* Frappe */}
                  <button
                    className="w-14 h-14 rounded-full bg-pink-500/10 border border-pink-500/50 flex items-center justify-center active:bg-pink-500/40 text-pink-400/90 font-black text-xs uppercase tracking-widest shadow-md select-none touch-none transition-transform active:scale-90"
                    style={{
                      boxShadow: '0 0 12px rgba(236, 72, 153, 0.2)',
                      backdropFilter: 'blur(2px)',
                      WebkitBackdropFilter: 'blur(2px)',
                      touchAction: 'none'
                    }}
                    onPointerDown={() => { inputManager.virtualInputs.punch = true; }}
                    onPointerUp={() => { inputManager.virtualInputs.punch = false; }}
                    onPointerLeave={() => { inputManager.virtualInputs.punch = false; }}
                  >
                    Punch
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Aide-mémoire des touches en bas du jeu */}
          <div className="mt-4 text-10px text-zinc-500 tracking-wider uppercase font-semibold flex gap-6">
            <span>P1 : ZQSD / WASD + Espace (Frapper) + Shift (Dash) + C (Parer)</span>
            {gameMode === 'versus' && (
              <span>P2 : Flèches + K (Frapper) + L (Dash) + I (Parer)</span>
            )}
          </div>


        </div>
      )}

      {screen === 'lobby' && (
        <OnlineLobby
          onBack={handleHome}
          onGameStart={handleOnlineGameStart}
        />
      )}

      {screen === 'gameover' && p1Char && p2Char && (
        <div className="relative min-h-screen">
          <GameOver
            winnerName={winnerName}
            p1Name={p1Char.name}
            p2Name={p2Char.name}
            p1ColorHex={p1Char.colorHex}
            p2ColorHex={p2Char.colorHex}
            onRestart={handleRestart}
            onHome={handleHome}
          />
        </div>
      )}
      {/* Overlay demandant de tourner l'appareil à l'horizontale en mode portrait sur mobile */}
      {showMobileControls && isPortrait && (
        <div 
          className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-6"
          style={{ zIndex: 999999 }}
        >
          <style>{`
            @keyframes rotate-device {
              0%, 100% { transform: rotate(0deg); }
              40%, 60% { transform: rotate(90deg); }
            }
          `}</style>
          <div className="mb-6 flex items-center justify-center">
            <svg
              className="w-20 h-20 text-pink-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 10px rgba(236, 72, 153, 0.4))' }}
            >
              <g style={{ transformOrigin: 'center', animation: 'rotate-device 2.2s ease-in-out infinite' }}>
                <rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" fill="none" />
                <path d="M12 18h.01" strokeWidth="2" />
              </g>
              <path d="M3 12a9 9 0 0 1 9-9" stroke="currentColor" strokeDasharray="3 3" opacity="0.5" />
              <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeDasharray="3 3" opacity="0.5" />
            </svg>
          </div>
          <h2 className="text-xl font-black uppercase tracking-widest text-pink-400 mb-2" style={{ filter: 'drop-shadow(0 0 8px rgba(236,72,153,0.3))' }}>
            Rotation Requise
          </h2>
          <p className="text-xs text-zinc-400 max-w-xs font-semibold uppercase tracking-wider">
            Veuillez tourner votre appareil à l'horizontale (mode paysage) pour combattre !
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
