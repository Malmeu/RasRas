/**
 * CharacterSelection.tsx
 * Écran de sélection des personnages avec statistiques de combat d'arcade.
 * Permet au joueur 1 et éventuellement au joueur 2 de choisir son combattant.
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { soundManager } from '../game/SoundManager';

export interface Character {
  id: string;
  name: string;
  color: number; // Hex code pour PixiJS
  colorHex: string; // CSS hex
  gloveColor: number;
  gloveColorHex: string;
  maxHp: number;
  speed: number;
  power: number;
  defense: number;
  description: string;
}

export const CHARACTERS: Character[] = [
  {
    id: 'raoul',
    name: 'Samir el euu3',
    color: 0xef4444, // Rouge
    colorHex: '#ef4444',
    gloveColor: 0xf97316, // Orange
    gloveColorHex: '#f97316',
    maxHp: 120,
    speed: 3.2,
    power: 10,
    defense: 4,
    description: 'Une force de la nature. Il frappe fort et encaisse comme un mur, mais ses déplacements sont lourds.',
  },
  {
    id: 'zouzou',
    name: "Zouzou l'Éclair",
    color: 0x06b6d4, // Cyan
    colorHex: '#06b6d4',
    gloveColor: 0x10b981, // Émeraude
    gloveColorHex: '#10b981',
    maxHp: 85,
    speed: 5.5,
    power: 5,
    defense: 1,
    description: 'Incroyablement agile et rapide sur le ring. Esquive avec aisance, mais attention au moindre coup lourd.',
  },
  {
    id: 'momo',
    name: 'Momo la Baston',
    color: 0xa855f7, // Violet
    colorHex: '#a855f7',
    gloveColor: 0xec4899, // Rose
    gloveColorHex: '#ec4899',
    maxHp: 100,
    speed: 4.2,
    power: 7,
    defense: 2.5,
    description: 'Le combattant polyvalent par excellence. Des statistiques équilibrées pour toutes les situations.',
  },
];

interface CharacterSelectionProps {
  gameMode: 'solo' | 'versus';
  onBack: () => void;
  onCharactersSelected: (p1: Character, p2: Character) => void;
}

export const CharacterSelection: React.FC<CharacterSelectionProps> = ({
  gameMode,
  onBack,
  onCharactersSelected,
}) => {
  const [p1Selection, setP1Selection] = React.useState<Character | null>(null);
  const [p2Selection, setP2Selection] = React.useState<Character | null>(null);

  const selectCharacter = (char: Character) => {
    soundManager.play('punch', { pitchVariation: 0.1 });

    if (gameMode === 'solo') {
      setP1Selection(char);
      const otherChars = CHARACTERS.filter(c => c.id !== char.id);
      const randomIAChar = otherChars[Math.floor(Math.random() * otherChars.length)];
      setP2Selection(randomIAChar);
    } else {
      // Versus
      if (!p1Selection) {
        setP1Selection(char);
      } else if (!p2Selection) {
        if (char.id !== p1Selection.id) {
          setP2Selection(char);
        }
      } else {
        // Si les deux sont déjà sélectionnés, le clic change le choix du joueur 2 (sauf si c'est celui du J1)
        if (char.id === p1Selection.id) {
          // Si on reclique sur le J1, on réinitialise J1
          setP1Selection(null);
          setP2Selection(null);
        } else if (char.id === p2Selection.id) {
          // Si on reclique sur le J2, on réinitialise J2
          setP2Selection(null);
        } else {
          setP2Selection(char);
        }
      }
    }
  };

  const handleStartFight = () => {
    if (p1Selection && p2Selection) {
      soundManager.play('fight');
      onCharactersSelected(p1Selection, p2Selection);
    }
  };

  const playHoverSound = () => {
    soundManager.play('countdown', { volumeScale: 0.2, pitchVariation: 0.05 });
  };

  // Titre selon la phase de sélection
  const getTitle = () => {
    if (gameMode === 'solo') return 'Choisissez votre Combattant';
    if (!p1Selection) return 'JOUEUR 1 : Choisissez votre Combattant';
    if (!p2Selection) return 'JOUEUR 2 : Choisissez votre Combattant';
    return 'Prêts pour le Combat !';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white px-4 relative overflow-hidden bg-slate-950" style={{ backgroundImage: 'radial-gradient(circle at bottom, var(--bg-purple-950) 0%, var(--bg-slate-950) 100%)' }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Bouton Retour */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-white-5 border border-white-10 hover:bg-white-10 text-zinc-300 text-sm font-semibold tracking-wider transition-all duration-200"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="text-center mb-8 relative z-10">
        <h2
          className="text-4xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-yellow-500"
          style={{ filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.3))', WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text' }}
        >
          {getTitle()}
        </h2>
      </div>

      {/* Grille des cartes personnages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full relative z-10 mb-6 px-2">
        {CHARACTERS.map((char) => {
          const isSelectedByP1 = p1Selection?.id === char.id;
          const isSelectedByP2 = p2Selection?.id === char.id;
          const isSelected = isSelectedByP1 || isSelectedByP2;

          return (
            <div
              key={char.id}
              onClick={() => selectCharacter(char)}
              onMouseEnter={playHoverSound}
              className={`group cursor-pointer rounded-2xl p-4 border backdrop-blur-md transition-all duration-300 transform flex flex-col justify-between relative overflow-hidden ${
                isSelectedByP1
                  ? 'bg-pink-950-20 border-pink-500 scale-[1.02]'
                  : isSelectedByP2
                    ? 'bg-cyan-950-20 border-cyan-500 scale-[1.02]'
                    : 'bg-slate-950-50 border-white-10 hover:border-pink-500-50'
              }`}
              style={isSelected ? {
                transform: 'scale(1.02)',
                boxShadow: isSelectedByP1 ? '0 0 20px rgba(219,39,119,0.25)' : '0 0 20px rgba(6,182,212,0.25)'
              } : {}}
            >
              {/* Effet visuel au survol */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${char.colorHex} 0%, transparent 70%)`,
                }}
              />

              {/* Tête de combattant en CSS réduite dans la carte */}
              <div className="flex justify-center items-center py-3 relative">
                <div
                  className="w-16 h-16 rounded-full border-2 border-zinc-950 relative transition-transform duration-300 group-hover:scale-105 flex items-center justify-center"
                  style={{ backgroundColor: char.colorHex, boxShadow: '0 0 15px rgba(0,0,0,0.3)' }}
                >
                  {/* Yeux */}
                  <div className="absolute top-[35%] left-[20%] w-3.5 h-3.5 rounded-full bg-white border border-black flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 translate-x-1px translate-y-1px" />
                  </div>
                  <div className="absolute top-[35%] right-[20%] w-3.5 h-3.5 rounded-full bg-white border border-black flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 translate-x-1px translate-y-1px" />
                  </div>

                  {/* Gants de boxe */}
                  <div
                    className="absolute bottom-[-3px] left-[-8px] w-5.5 h-5.5 rounded-full border-2 border-zinc-950 shadow-md"
                    style={{ backgroundColor: char.gloveColorHex }}
                  />
                  <div
                    className="absolute bottom-[-3px] right-[-8px] w-5.5 h-5.5 rounded-full border-2 border-zinc-950 shadow-md"
                    style={{ backgroundColor: char.gloveColorHex }}
                  />
                </div>
              </div>

              {/* Contenu textuel et statistiques en ligne ultra compactes */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-black uppercase text-center text-white tracking-tight group-hover:text-pink-400 transition-colors duration-200">
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

              {/* Étiquette d'état de sélection */}
              {isSelectedByP1 && (
                <div className="absolute top-2.5 right-2.5 bg-pink-600 border border-pink-400 text-white font-bold text-[8px] uppercase px-2 py-0.5 rounded-full shadow-md z-20">
                  Joueur 1
                </div>
              )}
              {isSelectedByP2 && (
                <div className="absolute top-2.5 right-2.5 bg-cyan-600 border border-cyan-400 text-white font-bold text-[8px] uppercase px-2 py-0.5 rounded-full shadow-md z-20">
                  {gameMode === 'solo' ? 'IA' : 'Joueur 2'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Zone de récapitulatif des personnages sélectionnés */}
      <div className="w-full max-w-4xl mt-6 relative z-10 flex flex-col md:flex-row items-center justify-center gap-6 bg-slate-950-60 border border-white-10 p-5 rounded-3xl backdrop-blur-xl">
        
        {/* Joueur 1 */}
        <div className="flex flex-col items-center gap-2 text-center w-full md:w-1/3 p-3 rounded-2xl bg-white-5 border border-white-5 relative">
          <span className="text-[10px] text-pink-500 font-bold uppercase tracking-widest">Joueur 1</span>
          {p1Selection ? (
            <div className="flex flex-col items-center gap-2 animate-scale-up">
              <div
                className="w-16 h-16 rounded-full border-2 border-zinc-950 flex items-center justify-center animate-bounce-subtle"
                style={{ backgroundColor: p1Selection.colorHex }}
              >
                <div className="absolute top-[35%] left-[20%] w-3.5 h-3.5 rounded-full bg-white border border-black flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 translate-x-1px translate-y-1px" />
                </div>
                <div className="absolute top-[35%] right-[20%] w-3.5 h-3.5 rounded-full bg-white border border-black flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 translate-x-1px translate-y-1px" />
                </div>
              </div>
              <span className="text-sm font-black uppercase tracking-tight text-white">{p1Selection.name}</span>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-zinc-600 text-xs font-bold uppercase italic">En attente J1...</div>
          )}
        </div>

        {/* VS Divider ou Bouton Combattre */}
        <div className="flex items-center justify-center w-full md:w-auto">
          {p1Selection && p2Selection ? (
            <button
              onClick={handleStartFight}
              className="py-4 px-8 rounded-2xl text-white font-black text-sm uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95 border border-white-10 animate-bounce-subtle"
              style={{
                background: 'linear-gradient(to right, var(--pink-500), var(--red-500))',
                boxShadow: '0 8px 24px rgba(239,68,68,0.4)'
              }}
            >
              Lancer le Combat
            </button>
          ) : (
            <div className="text-xl md:text-2xl font-black text-zinc-700 italic font-mono uppercase tracking-widest">VS</div>
          )}
        </div>

        {/* Joueur 2 / IA */}
        <div className="flex flex-col items-center gap-2 text-center w-full md:w-1/3 p-3 rounded-2xl bg-white-5 border border-white-5 relative">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">{gameMode === 'solo' ? 'IA' : 'Joueur 2'}</span>
          {p2Selection ? (
            <div className="flex flex-col items-center gap-2 animate-scale-up">
              <div
                className="w-16 h-16 rounded-full border-2 border-zinc-950 flex items-center justify-center animate-bounce-subtle"
                style={{ backgroundColor: p2Selection.colorHex }}
              >
                <div className="absolute top-[35%] left-[20%] w-3.5 h-3.5 rounded-full bg-white border border-black flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 translate-x-1px translate-y-1px" />
                </div>
                <div className="absolute top-[35%] right-[20%] w-3.5 h-3.5 rounded-full bg-white border border-black flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 translate-x-1px translate-y-1px" />
                </div>
              </div>
              <span className="text-sm font-black uppercase tracking-tight text-white">{p2Selection.name}</span>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-zinc-600 text-xs font-bold uppercase italic">En attente J2...</div>
          )}
        </div>

      </div>
    </div>
  );
};
