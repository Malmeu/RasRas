/**
 * MainMenu.tsx
 * Composant de menu d'accueil dynamique pour le jeu RasRas.
 * Propose la sélection de mode (Solo/Versus), la difficulté, et présente les contrôles du jeu.
 */

import React from 'react';
import { Swords, User, Users, Shield, Zap, Sparkles, Globe } from 'lucide-react';
import { soundManager } from '../game/SoundManager';

interface MainMenuProps {
  onStartGame: (mode: 'solo' | 'versus' | 'online', difficulty: 'easy' | 'normal' | 'hard') => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
  const [mode, setMode] = React.useState<'solo' | 'versus' | 'online'>('solo');
  const [difficulty, setDifficulty] = React.useState<'easy' | 'normal' | 'hard'>('normal');

  const handleStart = () => {
    soundManager.init(); // Initialiser l'audio sur clic
    soundManager.play('fight');
    onStartGame(mode, difficulty);
  };

  const playHoverSound = () => {
    soundManager.play('countdown', { volumeScale: 0.3, pitchVariation: 0.05 });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white px-4 relative overflow-hidden bg-slate-950" style={{ backgroundImage: 'radial-gradient(circle at top, var(--bg-purple-950) 0%, var(--bg-slate-950) 100%)' }}>
      {/* Grille de fond animée légère en CSS */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{ 
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '40px 40px' 
        }} 
      />

      {/* Titre Néon animé */}
      <div className="text-center mb-8 relative z-10 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-pink-500-20 bg-pink-500-10 text-pink-400 text-xs font-semibold uppercase tracking-wider mb-4 animate-pulse">
          <Sparkles size={12} /> Jeu de combat de ring <Sparkles size={12} />
        </div>
        <h1 
          className="text-7xl font-black uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 animate-bounce-subtle"
          style={{ filter: 'drop-shadow(0 0 35px rgba(239,68,68,0.5))', WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text' }}
        >
          RasRas
        </h1>
        <p className="text-zinc-400 text-lg font-medium tracking-wide mt-2 italic">
          " Tête à Tête "
        </p>
      </div>

      {/* Conteneur principal Glassmorphic */}
      <div className="w-full max-w-xl p-8 rounded-3xl bg-slate-950-60 border border-white-10 backdrop-blur-xl shadow-box-menu relative z-10 flex flex-col gap-6">
        
        {/* Choix du mode */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-pink-400">Mode de Jeu</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => { setMode('solo'); playHoverSound(); }}
              className={`flex flex-col items-center justify-center gap-2 py-3 px-3 rounded-2xl border transition-all duration-300 font-bold uppercase text-xs tracking-wider ${
                mode === 'solo'
                  ? 'border-pink-500 text-white'
                  : 'bg-white-5 border-white-10 text-zinc-400'
              }`}
              style={mode === 'solo' ? {
                background: 'linear-gradient(to right, var(--pink-600), var(--red-600))',
                boxShadow: '0 0 20px rgba(219,39,119,0.4)'
              } : {}}
            >
              <User size={16} />
              1 J (VS IA)
            </button>
            <button
              onClick={() => { setMode('versus'); playHoverSound(); }}
              className={`flex flex-col items-center justify-center gap-2 py-3 px-3 rounded-2xl border transition-all duration-300 font-bold uppercase text-xs tracking-wider ${
                mode === 'versus'
                  ? 'border-pink-500 text-white'
                  : 'bg-white-5 border-white-10 text-zinc-400'
              }`}
              style={mode === 'versus' ? {
                background: 'linear-gradient(to right, var(--pink-600), var(--red-600))',
                boxShadow: '0 0 20px rgba(219,39,119,0.4)'
              } : {}}
            >
              <Users size={16} />
              2 J (Local)
            </button>
            <button
              onClick={() => { setMode('online'); playHoverSound(); }}
              className={`flex flex-col items-center justify-center gap-2 py-3 px-3 rounded-2xl border transition-all duration-300 font-bold uppercase text-xs tracking-wider ${
                mode === 'online'
                  ? 'border-pink-500 text-white'
                  : 'bg-white-5 border-white-10 text-zinc-400'
              }`}
              style={mode === 'online' ? {
                background: 'linear-gradient(to right, var(--pink-600), var(--red-600))',
                boxShadow: '0 0 20px rgba(219,39,119,0.4)'
              } : {}}
            >
              <Globe size={16} />
              En Ligne
            </button>
          </div>
        </div>

        {/* Difficulté (si solo) */}
        {mode === 'solo' && (
          <div className="flex flex-col gap-2 animate-slide-down">
            <label className="text-xs font-bold uppercase tracking-wider text-pink-400">Difficulté de l'IA</label>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'normal', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => { setDifficulty(diff); playHoverSound(); }}
                  className={`py-2 px-4 rounded-xl border transition-all duration-200 font-bold uppercase text-xs tracking-wider ${
                    difficulty === diff
                      ? 'bg-red-500-20 border-red-500 text-red-400'
                      : 'bg-white-5 border-white-5 text-zinc-400'
                  }`}
                  style={difficulty === diff ? { boxShadow: '0 0 12px rgba(239,68,68,0.2)' } : {}}
                >
                  {diff === 'easy' ? 'Facile' : diff === 'normal' ? 'Normal' : 'Difficile'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Panneau de Contrôles */}
        <div className="p-5 rounded-2xl bg-white-5 border border-white-5 flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-pink-400 border-b border-white-5 pb-2">Contrôles du Clavier</h3>
          <div className="grid grid-cols-2 gap-6 text-xs text-zinc-300">
            <div>
              <p className="font-bold text-white mb-2" style={{ color: 'rgba(236,72,153,0.8)' }}>JOUEUR 1</p>
              <ul className="flex flex-col gap-1-5 list-none p-0 m-0">
                <li><strong className="text-white bg-white-10 px-1-5 py-1 rounded">ZQSD</strong> / <strong className="text-white bg-white-10 px-1-5 py-1 rounded">WASD</strong> : Déplacement</li>
                <li style={{ marginTop: '5px' }}><strong className="text-white bg-white-10 px-1-5 py-1 rounded">F</strong> ou <strong className="text-white bg-white-10 px-1-5 py-1 rounded">Espace</strong> : Frapper</li>
                <li style={{ marginTop: '5px' }}><strong className="text-white bg-white-10 px-1-5 py-1 rounded">G</strong> ou <strong className="text-white bg-white-10 px-1-5 py-1 rounded">Shift L</strong> : Dash (Esquive)</li>
                <li style={{ marginTop: '5px' }}><strong className="text-white bg-white-10 px-1-5 py-1 rounded">C</strong> ou <strong className="text-white bg-white-10 px-1-5 py-1 rounded">E</strong> : Parade / Blocage</li>
              </ul>
            </div>
            {mode === 'versus' ? (
              <div>
                <p className="font-bold text-white mb-2" style={{ color: 'rgba(236,72,153,0.8)' }}>JOUEUR 2</p>
                <ul className="flex flex-col gap-1-5 list-none p-0 m-0">
                  <li><strong className="text-white bg-white-10 px-1-5 py-1 rounded">Flèches</strong> : Déplacement</li>
                  <li style={{ marginTop: '5px' }}><strong className="text-white bg-white-10 px-1-5 py-1 rounded">K</strong> / <strong className="text-white bg-white-10 px-1-5 py-1 rounded">Num 1</strong> : Frapper</li>
                  <li style={{ marginTop: '5px' }}><strong className="text-white bg-white-10 px-1-5 py-1 rounded">L</strong> / <strong className="text-white bg-white-10 px-1-5 py-1 rounded">Num 2</strong> : Dash (Esquive)</li>
                  <li style={{ marginTop: '5px' }}><strong className="text-white bg-white-10 px-1-5 py-1 rounded">I</strong> / <strong className="text-white bg-white-10 px-1-5 py-1 rounded">Num 3</strong> : Parade</li>
                </ul>
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center text-center opacity-70">
                <Shield size={24} style={{ color: 'rgba(236,72,153,0.8)', marginBottom: '4px' }} />
                <Zap size={24} style={{ color: 'rgba(239,68,68,0.8)', marginBottom: '8px' }} />
                <p className="italic text-zinc-400">Rage à 100% ?<br/>Appuyez sur <strong className="text-white bg-white-10 px-1 py-1 rounded">Frappe + Parade</strong> pour le coup spécial !</p>
              </div>
            )}
          </div>
        </div>

        {/* Bouton Lancer */}
        <button
          onClick={handleStart}
          className="mt-2 w-full py-5 px-6 rounded-2xl text-white font-black text-lg uppercase tracking-widest transition-all duration-300 hover-scale-102 active-scale-98 flex items-center justify-center gap-3 border border-white-10"
          style={{
            background: 'linear-gradient(to right, var(--pink-500), var(--red-500), var(--yellow-500))',
            boxShadow: '0 10px 30px rgba(239,68,68,0.4)'
          }}
        >
          <Swords size={22} className="animate-spin-slow" />
          Monter sur le ring
        </button>

      </div>
    </div>
  );
};
