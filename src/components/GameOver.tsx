/**
 * GameOver.tsx
 * Écran de fin de partie affichant le gagnant du combat, des statistiques fun et permettant de relancer une partie.
 */

import React from 'react';
import { RotateCcw, Home, Trophy, Swords } from 'lucide-react';
import { soundManager } from '../game/SoundManager';

interface GameOverProps {
  winnerName: string;
  p1Name: string;
  p2Name: string;
  p1ColorHex: string;
  p2ColorHex: string;
  onRestart: () => void;
  onHome: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({
  winnerName,
  p1Name,
  p2Name,
  p1ColorHex,
  p2ColorHex,
  onRestart,
  onHome,
}) => {

  const handleRestart = () => {
    soundManager.play('fight');
    onRestart();
  };

  const handleHome = () => {
    soundManager.play('countdown');
    onHome();
  };

  const isTie = winnerName === 'ÉGALITÉ !';
  const winnerColor = winnerName === p1Name ? p1ColorHex : winnerName === p2Name ? p2ColorHex : '#ffffff';

  return (
    <div className="absolute inset-0 bg-slate-950-80 backdrop-blur-md flex flex-col items-center justify-center text-white z-50 animate-fade-in font-sans p-6 select-none">
      
      {/* Box de résultats Glassmorphic */}
      <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900-90 border border-white-10 shadow-box-over flex flex-col items-center text-center gap-6 relative overflow-hidden">
        
        {/* Lueur d'ambiance du gagnant */}
        <div
          className="absolute blur-70px opacity-35 pointer-events-none"
          style={{ 
            backgroundColor: winnerColor,
            top: '-6rem',
            width: '12rem',
            height: '12rem',
            borderRadius: '50%'
          }}
        />

        {/* Icône de trophée */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center border-2"
          style={{ borderColor: winnerColor, color: winnerColor, boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}
        >
          {isTie ? <Swords size={28} /> : <Trophy size={28} />}
        </div>

        {/* Texte Vainqueur */}
        <div className="flex flex-col gap-1">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">
            Résultat du Match
          </h2>
          {isTie ? (
            <h3 className="text-4xl font-black uppercase tracking-tight text-white" style={{ filter: 'drop-shadow(0 2px 10px rgba(255,255,255,0.1))' }}>
              {winnerName}
            </h3>
          ) : (
            <>
              <h3
                className="text-4xl font-black uppercase tracking-tight animate-bounce-subtle"
                style={{ color: winnerColor, filter: 'drop-shadow(0 2px 15px rgba(0,0,0,0.5))' }}
              >
                {winnerName}
              </h3>
              <p className="text-zinc-400 text-sm font-semibold tracking-wide">
                Remporte la confrontation !
              </p>
            </>
          )}
        </div>

        {/* Citation fun style jeu de combat retro */}
        <div className="p-4 rounded-xl bg-white-5 border border-white-5 w-full text-xs italic text-zinc-400">
          {isTie
            ? "Un combat acharné ! Les têtes se sont heurtées jusqu'à la dernière seconde sans vainqueur."
            : winnerName === p1Name
            ? `« ${p1Name} s'impose dans le ring avec autorité. Les coups ont résonné dans toute l'arène ! »`
            : `« L'adversaire a montré qui est le patron du ring. Entraînez-vous pour prendre votre revanche ! »`}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full mt-2">
          <button
            onClick={handleRestart}
            className="w-full py-4 px-6 rounded-2xl border border-pink-500-30 text-white font-black text-sm uppercase tracking-wider transition-all duration-300 hover-scale-102 active-scale-98 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(to right, var(--pink-600), var(--red-600))',
              boxShadow: '0 4px 15px rgba(220,38,38,0.3)'
            }}
          >
            <RotateCcw size={16} />
            Recommencer le Match
          </button>
          
          <button
            onClick={handleHome}
            className="w-full py-4 px-6 rounded-2xl bg-white-5 border border-white-10 text-zinc-300 font-bold text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Retour au Menu
          </button>
        </div>

      </div>
    </div>
  );
};
