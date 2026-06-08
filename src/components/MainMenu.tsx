/**
 * MainMenu.tsx
 * Composant de menu d'accueil dynamique pour le jeu RasRas.
 * Propose la sélection de mode (Solo/Versus/En ligne) et la difficulté dans un design épuré orienté mobile.
 */

import React from 'react';
import { Swords, User, Users, Globe, HelpCircle } from 'lucide-react';
import { soundManager } from '../game/SoundManager';

interface MainMenuProps {
  onStartGame: (mode: 'solo' | 'versus' | 'online', difficulty: 'easy' | 'normal' | 'hard') => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
  const [mode, setMode] = React.useState<'solo' | 'versus' | 'online'>('solo');
  const [difficulty, setDifficulty] = React.useState<'easy' | 'normal' | 'hard'>('normal');
  const [showControls, setShowControls] = React.useState(false);

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
                <span className="text-pink-400 font-bold">J1 :</span> ZQSD (Bouger) | Espace (Frapper) | Shift (Dash) | C (Parer)
              </div>
              <div>
                <span className="text-cyan-400 font-bold">J2 :</span> Flèches (Bouger) | K (Frapper) | L (Dash) | I (Parer)
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  </div>
  );
};

