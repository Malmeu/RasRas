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
import { StageSelection, STAGES } from './components/StageSelection';
import type { Stage } from './components/StageSelection';
import { Socket } from 'socket.io-client';
import { Volume2, VolumeX, Gamepad } from 'lucide-react';
import { soundManager } from './game/SoundManager';
import { inputManager } from './game/Input';

type GameScreen = 'menu' | 'selection' | 'stage_selection' | 'game' | 'gameover' | 'lobby';

function App() {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [gameMode, setGameMode] = useState<'solo' | 'versus' | 'online' | 'training'>('solo');
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  
  // États multijoueur en ligne
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineRole, setOnlineRole] = useState<'host' | 'client' | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  
  // Personnages sélectionnés
  const [p1Char, setP1Char] = useState<Character | null>(null);
  const [p2Char, setP2Char] = useState<Character | null>(null);

  // Arène sélectionnée
  const [selectedStage, setSelectedStage] = useState<Stage>(STAGES[0]);

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
    // Détection automatique du support tactile et des écrans typés mobiles/tablettes
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 1024;
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

  const joystickTouchId = useRef<number | null>(null);

  const handleJoystickTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (joystickTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchId.current = touch.identifier;
    setIsJoystickActive(true);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    joystickStartPos.current = { x: centerX, y: centerY };
    
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    updateJoystickPosition(dx, dy);
    
    if (e.cancelable) e.preventDefault();
  };

  const handleJoystickTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (joystickTouchId.current === null) return;
    
    let touch: React.Touch | null = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === joystickTouchId.current) {
        touch = e.touches[i];
        break;
      }
    }
    
    if (touch) {
      const dx = touch.clientX - joystickStartPos.current.x;
      const dy = touch.clientY - joystickStartPos.current.y;
      updateJoystickPosition(dx, dy);
    }
    
    if (e.cancelable) e.preventDefault();
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (joystickTouchId.current === null) return;
    
    let hasEnded = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId.current) {
        hasEnded = true;
        break;
      }
    }
    
    if (hasEnded) {
      joystickTouchId.current = null;
      setIsJoystickActive(false);
      setJoystickOffset({ x: 0, y: 0 });
      
      inputManager.virtualInputs.left = false;
      inputManager.virtualInputs.right = false;
      inputManager.virtualInputs.up = false;
      inputManager.virtualInputs.down = false;
    }
  };

  const handleActionTouchStart = (action: 'block' | 'dash' | 'super' | 'punch', e: React.TouchEvent) => {
    inputManager.virtualInputs[action] = true;
    if (e.cancelable) e.preventDefault();
  };

  const handleActionTouchEnd = (action: 'block' | 'dash' | 'super' | 'punch', e: React.TouchEvent) => {
    inputManager.virtualInputs[action] = false;
    if (e.cancelable) e.preventDefault();
  };

  // Initialise le jeu après sélection du mode
  const handleStartGame = (mode: 'solo' | 'versus' | 'online' | 'training', diff: 'easy' | 'normal' | 'hard') => {
    setGameMode(mode);
    setDifficulty(diff);
    if (mode === 'online') {
      setScreen('lobby');
    } else {
      setScreen('selection');
    }
  };

  // Lance la sélection de l'arène après sélection des personnages
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
    setScreen('stage_selection');
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
      // Relance directement le match avec le même niveau et les mêmes personnages
      setLiveData({
        p1Hp: p1Char.maxHp,
        p2Hp: p2Char.maxHp,
        p1Rage: 0,
        p2Rage: 0,
        p1Combo: 0,
        p2Combo: 0,
        gameTime: 99,
        isKO: false,
      });
      setIsPaused(false);
      setScreen('game');
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
      
      {/* Barre de contrôle utilitaire en haut à droite (Sons / Aide / Tactile) - Masquée pendant le combat, intégrée au HUD */}
      {screen !== 'game' && (
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
      )}

      {/* RENDER DES DIFFÉRENTS ÉCRANS */}
      {screen === 'menu' && (
        <MainMenu onStartGame={handleStartGame} />
      )}

      {screen === 'selection' && (
        <CharacterSelection
          gameMode={gameMode === 'versus' ? 'versus' : 'solo'}
          onBack={handleHome}
          onCharactersSelected={handleCharactersSelected}
        />
      )}

      {screen === 'stage_selection' && (
        <StageSelection
          onBack={() => setScreen('selection')}
          onStageSelected={(stage) => {
            setSelectedStage(stage);
            setScreen('game');
          }}
        />
      )}

      {screen === 'game' && p1Char && p2Char && (
        <div className={`flex-1 flex flex-col items-center justify-center min-h-screen relative overflow-hidden bg-slate-950 ${showMobileControls ? 'p-0' : 'px-4 py-8'}`}>
          
          {/* Grille de fond en style CSS (desktop uniquement) */}
          {!showMobileControls && (
            <div className="absolute inset-0 bg-slate-950 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(120,50,200,0.15) 0%, transparent 80%)' }} />
          )}

          {/* En-tête informatif (desktop uniquement, masqué sur mobile pour le plein écran) */}
          {!showMobileControls && (
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
          )}

          {/* Arène de jeu principale (Responsive et dimensionnée au ratio exact) */}
          <div 
            className={showMobileControls ? "mobile-arena-container" : "desktop-arena-container"}
            style={showMobileControls ? {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: 'calc(100% - 120px)',
              overflow: 'hidden',
              backgroundColor: '#0c0c14',
              zIndex: 20
            } : {
              position: 'relative',
              borderRadius: '1rem',
              overflow: 'hidden',
              backgroundColor: '#12121c',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
              width: '100%',
              maxWidth: '800px',
              aspectRatio: '800 / 550'
            }}
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
              isMobile={showMobileControls}
              stage={selectedStage}
            />

            {/* Overlay d'effet KO "Sedma kbira" de Street Fighter */}
            {liveData.isKO && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ko-flash-bg" style={{ zIndex: 900 }}>
                <div className="animate-ko-bounce-text select-none">
                  <h1 className="ko-text-kiw">Sedma kbira</h1>
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
                showMobileControls={showMobileControls}
                onToggleMobileControls={() => setShowMobileControls(!showMobileControls)}
                soundEnabled={soundEnabled}
                onToggleSound={toggleSound}
                gameMode={gameMode}
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
          </div>

          {/* Overlay des contrôles tactiles mobiles fixés aux extrémités physiques de l'écran du téléphone */}
          {showMobileControls && (
            <div className="mobile-controls-overlay">
              {/* Stick directionnel à gauche */}
              <div className={`mobile-joystick-container ${isJoystickActive ? 'active' : ''}`}>
                <div 
                  className="mobile-joystick-base"
                  onTouchStart={handleJoystickTouchStart}
                  onTouchMove={handleJoystickTouchMove}
                  onTouchEnd={handleJoystickTouchEnd}
                  onTouchCancel={handleJoystickTouchEnd}
                >
                  <div 
                    className="mobile-joystick-handle"
                    style={{
                      transform: `translate(${joystickOffset.x}px, ${joystickOffset.y}px)`,
                      transition: isJoystickActive ? 'none' : 'transform 0.15s ease-out',
                    }}
                  />
                </div>
              </div>

              {/* Boutons d'action à droite */}
              <div className="mobile-buttons-container">
                {/* Parade */}
                <button
                  className="mobile-action-btn mobile-btn-block"
                  onTouchStart={(e) => handleActionTouchStart('block', e)}
                  onTouchEnd={(e) => handleActionTouchEnd('block', e)}
                  onTouchCancel={(e) => handleActionTouchEnd('block', e)}
                >
                  Parer
                </button>

                {/* Esquive */}
                <button
                  className="mobile-action-btn mobile-btn-dash"
                  onTouchStart={(e) => handleActionTouchStart('dash', e)}
                  onTouchEnd={(e) => handleActionTouchEnd('dash', e)}
                  onTouchCancel={(e) => handleActionTouchEnd('dash', e)}
                >
                  Dash
                </button>

                {/* Coup Spécial (Super) - Visible uniquement si jauge pleine */}
                {liveData.p1Rage >= 100 && (
                  <button
                    className="mobile-action-btn animate-pulse"
                    onTouchStart={(e) => handleActionTouchStart('super', e)}
                    onTouchEnd={(e) => handleActionTouchEnd('super', e)}
                    onTouchCancel={(e) => handleActionTouchEnd('super', e)}
                    style={{
                      width: '58px',
                      height: '58px',
                      fontSize: '11px',
                      background: 'linear-gradient(135deg, #dc2626 0%, #f59e0b 100%)',
                      textShadow: '0 0 6px #f59e0b',
                      border: '2px solid #ffffff',
                      boxShadow: '0 0 15px rgba(245, 158, 11, 0.8)',
                    }}
                  >
                    Super
                  </button>
                )}

                {/* Frappe */}
                <button
                  className="mobile-action-btn mobile-btn-punch"
                  onTouchStart={(e) => handleActionTouchStart('punch', e)}
                  onTouchEnd={(e) => handleActionTouchEnd('punch', e)}
                  onTouchCancel={(e) => handleActionTouchEnd('punch', e)}
                >
                  Punch
                </button>
              </div>
            </div>
          )}

          {/* Aide-mémoire des touches en bas du jeu (desktop uniquement) */}
          {!showMobileControls && (
            <div className="mt-4 text-10px text-zinc-500 tracking-wider uppercase font-semibold flex gap-6">
              <span>P1 : ZQSD / WASD + Espace (Frappe) + Shift (Dash) + C (Parer) + R (Super)</span>
              {gameMode === 'versus' && (
                <span>P2 : Flèches + K (Frappe) + L (Dash) + I (Parer) + O (Super)</span>
              )}
            </div>
          )}
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
