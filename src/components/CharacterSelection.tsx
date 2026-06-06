/**
 * CharacterSelection.tsx
 * Écran de sélection des personnages avec statistiques de combat d'arcade.
 * Permet au joueur 1 et éventuellement au joueur 2 de choisir son combattant.
 */

import React from 'react';
import { ArrowLeft, Swords, Shield, Zap, Heart } from 'lucide-react';
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

  const selectCharacter = (char: Character) => {
    soundManager.play('punch', { pitchVariation: 0.1 });

    if (gameMode === 'solo') {
      // En solo, on choisit son personnage, et l'IA en prend un autre aléatoirement
      const otherChars = CHARACTERS.filter(c => c.id !== char.id);
      const randomIAChar = otherChars[Math.floor(Math.random() * otherChars.length)];
      onCharactersSelected(char, randomIAChar);
    } else {
      // En versus, le joueur 1 choisit d'abord, puis le joueur 2
      if (!p1Selection) {
        setP1Selection(char);
      } else if (char.id !== p1Selection.id) {
        onCharactersSelected(p1Selection, char);
      }
    }
  };

  const playHoverSound = () => {
    soundManager.play('countdown', { volumeScale: 0.2, pitchVariation: 0.05 });
  };

  // Titre selon la phase de sélection
  const getTitle = () => {
    if (gameMode === 'solo') return 'Choisissez votre Combattant';
    if (!p1Selection) return 'JOUEUR 1 : Choisissez votre Combattant';
    return 'JOUEUR 2 : Choisissez votre Combattant';
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full relative z-10 mb-8">
        {CHARACTERS.map((char) => {
          const isSelectedByP1 = p1Selection?.id === char.id;
          const isDisabled = p1Selection !== null && isSelectedByP1 && gameMode === 'versus';

          return (
            <div
              key={char.id}
              onClick={() => !isDisabled && selectCharacter(char)}
              onMouseEnter={playHoverSound}
              className={`group cursor-pointer rounded-3xl p-6 border backdrop-blur-md transition-all duration-300 transform flex flex-col justify-between h-p450 relative overflow-hidden ${isSelectedByP1
                  ? 'bg-pink-950-20 border-pink-500 scale-[1.03]'
                  : isDisabled
                    ? 'opacity-40 cursor-not-allowed border-white-5 bg-black-20'
                    : 'bg-slate-950-50 border-white-10 hover:border-pink-500-50'
                }`}
              style={isSelectedByP1 ? {
                transform: 'scale(1.03)',
                boxShadow: '0 0 30px rgba(219,39,119,0.3)'
              } : {}}
            >
              {/* Effet visuel au survol */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${char.colorHex} 0%, transparent 70%)`,
                }}
              />

              {/* Tête de combattant en CSS dans la carte */}
              <div className="flex justify-center items-center py-6 relative">
                {/* Représentation visuelle du personnage en CSS */}
                <div
                  className="w-24 h-24 rounded-full border-3 border-zinc-950 relative transition-transform duration-300 group-hover:scale-110 flex items-center justify-center"
                  style={{ backgroundColor: char.colorHex, boxShadow: '0 0 25px rgba(0,0,0,0.3)' }}
                >
                  {/* Yeux */}
                  <div className="absolute top-[35%] left-[20%] w-5 h-5 rounded-full bg-white border border-black flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-zinc-950 translate-x-2px translate-y-1px" />
                  </div>
                  <div className="absolute top-[35%] right-[20%] w-5 h-5 rounded-full bg-white border border-black flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-zinc-950 translate-x-2px translate-y-1px" />
                  </div>

                  {/* Gants de boxe */}
                  <div
                    className="absolute bottom-[-5px] left-[-15px] w-8 h-8 rounded-full border-2 border-zinc-950 shadow-md animate-bounce-subtle"
                    style={{ backgroundColor: char.gloveColorHex }}
                  />
                  <div
                    className="absolute bottom-[-5px] right-[-15px] w-8 h-8 rounded-full border-2 border-zinc-950 shadow-md animate-bounce-subtle"
                    style={{ backgroundColor: char.gloveColorHex, animationDelay: '0.2s' }}
                  />
                </div>
              </div>

              {/* Contenu textuel */}
              <div>
                <h3 className="text-xl font-black uppercase text-white mb-2 tracking-tight group-hover:text-pink-400 transition-colors duration-200">
                  {char.name}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4" style={{ minHeight: '50px' }}>
                  {char.description}
                </p>

                {/* Statistiques barres */}
                <div className="flex flex-col gap-2-5 bg-black-30 p-4 rounded-2xl border border-white-5">
                  {/* Sante */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-10px uppercase font-bold text-zinc-400">
                      <span className="flex items-center gap-1"><Heart size={10} className="text-red-500" /> Points de Vie</span>
                      <span className="text-white font-mono">{char.maxHp} HP</span>
                    </div>
                    <div className="w-full h-1-5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${(char.maxHp / 120) * 100}%` }} />
                    </div>
                  </div>

                  {/* Vitesse */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-10px uppercase font-bold text-zinc-400">
                      <span className="flex items-center gap-1"><Zap size={10} className="text-cyan-400" /> Vitesse</span>
                      <span className="text-white font-mono">{char.speed.toFixed(1)}</span>
                    </div>
                    <div className="w-full h-1-5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400" style={{ width: `${(char.speed / 6) * 100}%` }} />
                    </div>
                  </div>

                  {/* Puissance */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-10px uppercase font-bold text-zinc-400">
                      <span className="flex items-center gap-1"><Swords size={10} className="text-orange-500" /> Puissance</span>
                      <span className="text-white font-mono">{char.power}</span>
                    </div>
                    <div className="w-full h-1-5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500" style={{ width: `${(char.power / 10) * 100}%` }} />
                    </div>
                  </div>

                  {/* Defense */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-10px uppercase font-bold text-zinc-400">
                      <span className="flex items-center gap-1"><Shield size={10} className="text-emerald-400" /> Défense</span>
                      <span className="text-white font-mono">{char.defense}</span>
                    </div>
                    <div className="w-full h-1-5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${(char.defense / 5) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Étiquette d'état de sélection */}
              {isSelectedByP1 && (
                <div className="absolute top-4 right-4 bg-pink-600 border border-pink-400 text-white font-bold text-10px uppercase px-2-5 py-1 rounded-full shadow-md">
                  Joueur 1
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
