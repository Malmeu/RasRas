/**
 * MainMenu.tsx
 * Composant de menu d'accueil dynamique pour le jeu RasRas.
 * Propose la sélection de mode (Solo/Versus/En ligne) et la difficulté dans un design épuré orienté mobile.
 */

import React from 'react';
import { Swords, User, Users, Globe, HelpCircle, Settings, Volume2, X } from 'lucide-react';
import { soundManager } from '../game/SoundManager';
import { inputManager } from '../game/Input';
import type { KeyMapping } from '../game/Input';

interface MainMenuProps {
  onStartGame: (mode: 'solo' | 'versus' | 'online', difficulty: 'easy' | 'normal' | 'hard') => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
  const [mode, setMode] = React.useState<'solo' | 'versus' | 'online'>('solo');
  const [difficulty, setDifficulty] = React.useState<'easy' | 'normal' | 'hard'>('normal');
  const [showControls, setShowControls] = React.useState(false);
  const [showOptions, setShowOptions] = React.useState(false);
  const [volumeState, setVolumeState] = React.useState(soundManager.getMasterVolume());
  const [p1KeysState, setP1KeysState] = React.useState<KeyMapping>({ ...inputManager.p1Keys });
  const [p2KeysState, setP2KeysState] = React.useState<KeyMapping>({ ...inputManager.p2Keys });
  const [listeningKey, setListeningKey] = React.useState<{ player: 1 | 2; action: keyof KeyMapping } | null>(null);

  React.useEffect(() => {
    if (!listeningKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const newCode = e.code;
      
      if (listeningKey.player === 1) {
        inputManager.p1Keys[listeningKey.action] = newCode;
        setP1KeysState({ ...inputManager.p1Keys });
      } else {
        inputManager.p2Keys[listeningKey.action] = newCode;
        setP2KeysState({ ...inputManager.p2Keys });
      }
      
      inputManager.saveKeys();
      setListeningKey(null);
      soundManager.play('punch', { volumeScale: 0.4 });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [listeningKey]);

  const formatKeyName = (code: string): string => {
    if (!code) return '...';
    if (code.startsWith('Key')) return code.substring(3);
    if (code.startsWith('Digit')) return code.substring(5);
    if (code.startsWith('Numpad')) return 'Num ' + code.substring(6);
    switch (code) {
      case 'Space': return 'ESPACE';
      case 'ShiftLeft': return 'MAJ G';
      case 'ShiftRight': return 'MAJ D';
      case 'ControlLeft': return 'CTRL G';
      case 'ArrowUp': return '↑';
      case 'ArrowDown': return '↓';
      case 'ArrowLeft': return '←';
      case 'ArrowRight': return '→';
      default: return code;
    }
  };

  const handleStart = () => {
    soundManager.init(); // Initialiser l'audio sur clic
    soundManager.play('fight');
    onStartGame(mode, difficulty);
  };

  const playHoverSound = () => {
    soundManager.play('countdown', { volumeScale: 0.3, pitchVariation: 0.05 });
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-slate-950 text-white overflow-hidden">
      
      <div 
        className="relative flex flex-col items-center justify-end pb-8 text-white px-4"
        style={{
          width: 'min(100vw, 100vh)',
          height: 'min(100vw, 100vh)',
          backgroundImage: 'url("/assets/images/main.jpeg")',
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        
        {/* Grille de fond animée légère en CSS dans le conteneur carré */}
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ 
            backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.01) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.01) 1px, transparent 1px)',
            backgroundSize: '40px 40px' 
          }} 
        />

        {/* Menu Box épurée et compacte (idéale pour mobile paysage) */}
        <div className="w-full max-w-sm p-5 rounded-3xl bg-slate-950-80 border border-white-10 backdrop-blur-xl shadow-box-menu relative z-10 flex flex-col gap-3">
        
        {/* Choix du mode */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => { setMode('solo'); playHoverSound(); }}
              className={`flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-2xl border transition-all duration-300 font-black uppercase text-[10px] tracking-wider ${
                mode === 'solo'
                  ? 'border-pink-500 text-white'
                  : 'bg-white-5 border-white-10 text-zinc-400'
              }`}
              style={mode === 'solo' ? {
                background: 'linear-gradient(to bottom right, var(--pink-600), var(--red-600))',
                boxShadow: '0 0 15px rgba(219,39,119,0.3)'
              } : {}}
            >
              <User size={18} />
              Solo (IA)
            </button>
            <button
              onClick={() => { setMode('versus'); playHoverSound(); }}
              className={`flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-2xl border transition-all duration-300 font-black uppercase text-[10px] tracking-wider ${
                mode === 'versus'
                  ? 'border-pink-500 text-white'
                  : 'bg-white-5 border-white-10 text-zinc-400'
              }`}
              style={mode === 'versus' ? {
                background: 'linear-gradient(to bottom right, var(--pink-600), var(--red-600))',
                boxShadow: '0 0 15px rgba(219,39,119,0.3)'
              } : {}}
            >
              <Users size={18} />
              Versus
            </button>
            <button
              onClick={() => { setMode('online'); playHoverSound(); }}
              className={`flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-2xl border transition-all duration-300 font-black uppercase text-[10px] tracking-wider ${
                mode === 'online'
                  ? 'border-pink-500 text-white'
                  : 'bg-white-5 border-white-10 text-zinc-400'
              }`}
              style={mode === 'online' ? {
                background: 'linear-gradient(to bottom right, var(--pink-600), var(--red-600))',
                boxShadow: '0 0 15px rgba(219,39,119,0.3)'
              } : {}}
            >
              <Globe size={18} />
              En Ligne
            </button>
          </div>
        </div>

        {/* Difficulté (si solo) */}
        {mode === 'solo' && (
          <div className="flex flex-col gap-1.5 animate-scale-up">
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'normal', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => { setDifficulty(diff); playHoverSound(); }}
                  className={`py-2 px-1.5 rounded-xl border transition-all duration-200 font-bold uppercase text-[9px] tracking-wider ${
                    difficulty === diff
                      ? 'bg-red-500-20 border-red-500 text-red-400'
                      : 'bg-white-5 border-white-5 text-zinc-400'
                  }`}
                >
                  {diff === 'easy' ? 'IA Facile' : diff === 'normal' ? 'IA Normal' : 'IA Difficile'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bouton Combattre */}
        <button
          onClick={handleStart}
          className="w-full py-4.5 rounded-2xl text-white font-black text-base uppercase tracking-widest transition-all duration-300 hover-scale-102 active-scale-98 flex items-center justify-center gap-2 border border-white-10"
          style={{
            background: 'linear-gradient(to right, var(--pink-500), var(--red-500))',
            boxShadow: '0 8px 24px rgba(239,68,68,0.3)'
          }}
        >
          <Swords size={18} />
          Combattre
        </button>

        {/* Bouton Options */}
        <button
          onClick={() => { setShowOptions(true); playHoverSound(); }}
          className="w-full py-2.5 rounded-xl bg-white-5 border border-white-10 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 hover:bg-white-10 active-scale-98"
        >
          <Settings size={14} />
          Options
        </button>

        {/* Petit bouton d'aide discret */}
        <div className="flex justify-center mt-1">
          <button 
            onClick={() => setShowControls(!showControls)}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 uppercase tracking-widest font-bold"
          >
            <HelpCircle size={12} />
            {showControls ? "Masquer les commandes" : "Commandes clavier"}
          </button>
        </div>

        {/* Bloc d'aide dépliant */}
        {showControls && (
          <div className="p-3.5 rounded-xl bg-white-5 border border-white-5 text-[10px] text-zinc-400 flex flex-col gap-2 animate-scale-up">
            <p className="font-bold text-white uppercase tracking-wider">Configuration Clavier :</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-pink-400 font-bold">J1 :</span> {formatKeyName(p1KeysState.up)}{formatKeyName(p1KeysState.left)}{formatKeyName(p1KeysState.down)}{formatKeyName(p1KeysState.right)} (Bouger) | {formatKeyName(p1KeysState.punch)} (Frapper) | {formatKeyName(p1KeysState.dash)} (Dash) | {formatKeyName(p1KeysState.block)} (Parer) | {formatKeyName(p1KeysState.super)} (Super)
              </div>
              <div>
                <span className="text-cyan-400 font-bold">J2 :</span> {formatKeyName(p2KeysState.up)}{formatKeyName(p2KeysState.left)}{formatKeyName(p2KeysState.down)}{formatKeyName(p2KeysState.right)} (Bouger) | {formatKeyName(p2KeysState.punch)} (Frapper) | {formatKeyName(p2KeysState.dash)} (Dash) | {formatKeyName(p2KeysState.block)} (Parer) | {formatKeyName(p2KeysState.super)} (Super)
              </div>
            </div>
          </div>
        )}

      </div> {/* Fermeture de la Menu Box ici pour qu'elle s'arrête avant le modal */}

      {/* Modal d'Options (Enfant direct de la pochette carrée parent, occupant presque tout le carré avec inset-4) */}
      {showOptions && (
        <div className="absolute inset-4 bg-slate-950 bg-opacity-95 backdrop-blur-xl z-50 flex flex-col items-center justify-between p-4 rounded-3xl animate-scale-up border border-white-10">
            {/* En-tête */}
            <div className="w-full flex justify-between items-center border-b border-white-10 pb-2 mb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-pink-500 flex items-center gap-1.5">
                <Settings size={14} />
                Réglages du jeu
              </h3>
              <button
                onClick={() => { setShowOptions(false); playHoverSound(); }}
                className="p-1 rounded-full hover:bg-white-10 text-zinc-400 hover:text-white transition-all duration-200"
              >
                <X size={14} />
              </button>
            </div>

            {/* Contenu - Audio & Clavier */}
            <div className="w-full flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
              
              {/* Section Audio */}
              <div className="flex flex-col gap-1 bg-white-5 p-2.5 rounded-2xl border border-white-5">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                  <Volume2 size={12} />
                  Volume : {Math.round(volumeState * 100)}%
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volumeState}
                  onChange={(e) => {
                    const vol = parseFloat(e.target.value);
                    soundManager.setMasterVolume(vol);
                    setVolumeState(vol);
                  }}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
              </div>

              {/* Section Contrôles Clavier */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                  Configuration des touches clavier
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  
                  {/* JOUEUR 1 */}
                  <div className="bg-pink-500-10 p-2 rounded-2xl border border-pink-500-20 flex flex-col gap-1">
                    <span className="text-[9px] font-black text-pink-400 uppercase tracking-widest text-center border-b border-pink-500-20 pb-0.5 mb-1">
                      Joueur 1
                    </span>
                    <div className="flex flex-col gap-0.5 text-[8px] font-bold text-zinc-300">
                      {(Object.keys(p1KeysState) as Array<keyof KeyMapping>).map((action) => {
                        const isListening = listeningKey?.player === 1 && listeningKey.action === action;
                        return (
                          <div key={action} className="flex justify-between items-center h-5">
                            <span className="uppercase text-zinc-400">{action === 'up' ? 'Haut' : action === 'down' ? 'Bas' : action === 'left' ? 'Gauche' : action === 'right' ? 'Droite' : action === 'punch' ? 'Frapper' : action === 'dash' ? 'Esquive' : action === 'block' ? 'Parer' : 'Super'}</span>
                            <button
                              onClick={() => { setListeningKey({ player: 1, action }); playHoverSound(); }}
                              className={`px-1.5 py-0.5 rounded border text-[8px] font-mono transition-all duration-150 ${isListening ? 'bg-red-600 border-red-500 text-white animate-pulse' : 'bg-slate-900 border-white-10 hover:border-pink-500-40 text-zinc-200'}`}
                            >
                              {isListening ? '?' : formatKeyName(p1KeysState[action])}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* JOUEUR 2 */}
                  <div className="bg-cyan-500-10 p-2 rounded-2xl border border-cyan-500-20 flex flex-col gap-1">
                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest text-center border-b border-cyan-500-20 pb-0.5 mb-1">
                      Joueur 2
                    </span>
                    <div className="flex flex-col gap-0.5 text-[8px] font-bold text-zinc-300">
                      {(Object.keys(p2KeysState) as Array<keyof KeyMapping>).map((action) => {
                        const isListening = listeningKey?.player === 2 && listeningKey.action === action;
                        return (
                          <div key={action} className="flex justify-between items-center h-5">
                            <span className="uppercase text-zinc-400">{action === 'up' ? 'Haut' : action === 'down' ? 'Bas' : action === 'left' ? 'Gauche' : action === 'right' ? 'Droite' : action === 'punch' ? 'Frapper' : action === 'dash' ? 'Esquive' : action === 'block' ? 'Parer' : 'Super'}</span>
                            <button
                              onClick={() => { setListeningKey({ player: 2, action }); playHoverSound(); }}
                              className={`px-1.5 py-0.5 rounded border text-[8px] font-mono transition-all duration-150 ${isListening ? 'bg-red-600 border-red-500 text-white animate-pulse' : 'bg-slate-900 border-white-10 hover:border-cyan-500-40 text-zinc-200'}`}
                            >
                              {isListening ? '?' : formatKeyName(p2KeysState[action])}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Pied du modal */}
            <div className="w-full border-t border-white-10 pt-2 text-center mt-1.5 flex justify-between items-center">
              <span className="text-[7px] text-zinc-500 uppercase italic">Cliquez sur une touche pour la réassigner</span>
              <button
                onClick={() => { setShowOptions(false); playHoverSound(); }}
                className="py-1 px-3 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-black text-[9px] uppercase tracking-wider transition-all duration-200"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

    </div>
  </div>
  );
};

