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
    console.log('[CharacterSelection] selectCharacter appelé pour:', char.id);
    soundManager.play('punch', { pitchVariation: 0.1 });

    if (gameMode === 'solo') {
      setP1Selection(char);
      const otherChars = CHARACTERS.filter(c => c.id !== char.id);
      const randomIAChar = otherChars[Math.floor(Math.random() * otherChars.length)];
      setP2Selection(randomIAChar);
      console.log('[CharacterSelection] Mode Solo - J1 selectionné:', char.id, ', IA sélectionnée:', randomIAChar.id);
    } else {
      // Versus
      if (!p1Selection) {
        setP1Selection(char);
        console.log('[CharacterSelection] Mode Versus - J1 selectionné:', char.id);
      } else if (!p2Selection) {
        if (char.id !== p1Selection.id) {
          setP2Selection(char);
          console.log('[CharacterSelection] Mode Versus - J2 selectionné:', char.id);
        }
      } else {
        // Si les deux sont déjà sélectionnés, le clic change le choix du joueur 2 (sauf si c'est celui du J1)
        if (char.id === p1Selection.id) {
          // Si on reclique sur le J1, on réinitialise J1
          setP1Selection(null);
          setP2Selection(null);
          console.log('[CharacterSelection] Réinitialisation des sélections.');
        } else if (char.id === p2Selection.id) {
          // Si on reclique sur le J2, on réinitialise J2
          setP2Selection(null);
          console.log('[CharacterSelection] Réinitialisation J2.');
        } else {
          setP2Selection(char);
          console.log('[CharacterSelection] Changement J2 pour:', char.id);
        }
      }
    }
  };

  const handleStartFight = () => {
    console.log('[CharacterSelection] handleStartFight exécuté. Envoi des personnages à App.tsx :', p1Selection?.id, 'et', p2Selection?.id);
    if (p1Selection && p2Selection) {
      try {
        soundManager.play('fight');
      } catch (e) {
        console.warn('[CharacterSelection] Erreur lecture audio fight:', e);
      }
      onCharactersSelected(p1Selection, p2Selection);
    }
  };

  const playHoverSound = () => {
    soundManager.play('countdown', { volumeScale: 0.2, pitchVariation: 0.05 });
  };

  // Titre selon la phase de sélection
  const getTitle = () => {
    if (gameMode === 'solo') return 'Sélection du Combattant';
    if (!p1Selection) return 'Joueur 1 : Choisissez !';
    if (!p2Selection) return 'Joueur 2 : Choisissez !';
    return 'Prêts pour le Combat !';
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen text-white p-4 relative overflow-hidden bg-slate-950" style={{ backgroundImage: 'radial-gradient(circle at bottom, var(--bg-purple-950) 0%, var(--bg-slate-950) 100%)' }}>
      {/* Grille de fond */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      {/* Barre supérieure : Bouton Retour et Titre */}
      <div className="w-full flex items-center justify-between relative z-10 mb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white-5 border border-white-10 hover:bg-white-10 text-zinc-300 text-xs font-bold transition-all duration-200"
        >
          <ArrowLeft size={12} />
          Retour
        </button>
        
        <h2
          className="text-lg md:text-xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500"
          style={{ filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.4))' }}
        >
          {getTitle()}
        </h2>

        {/* Espaceur invisible à droite pour centrer le titre */}
        <div className="w-16" />
      </div>

      {/* Layout Principal Style Street Fighter (Compact et Horizontal) */}
      <div className="w-full max-w-4xl grid grid-cols-3 gap-4 items-center my-auto relative z-10 px-2">
        
        {/* COLONNE GAUCHE - PORTRAIT ET STATS JOUEUR 1 */}
        <div className="flex flex-col items-center gap-2 bg-slate-950-60 border border-pink-500-30 p-3 rounded-2xl backdrop-blur-xl w-full min-h-[180px] justify-between relative overflow-hidden shadow-md">
          <div className="absolute inset-0 bg-pink-500-5 pointer-events-none" />
          <span className="text-[9px] text-pink-500 font-black uppercase tracking-widest">Joueur 1</span>
          
          {p1Selection ? (
            <div className="flex flex-col items-center gap-1.5 w-full animate-scale-up">
              {/* Portrait compact */}
              <div className="rounded-full border-3 border-pink-500 flex items-center justify-center bg-slate-900 shadow-md relative animate-bounce-subtle" style={{ width: '70px', height: '70px', backgroundColor: p1Selection.colorHex }}>
                {/* Yeux */}
                <div className="absolute top-[35%] left-[20%] rounded-full bg-white border border-black flex items-center justify-center" style={{ width: '12px', height: '12px' }}>
                  <div className="rounded-full bg-zinc-950 translate-x-0.5 translate-y-0.5" style={{ width: '6px', height: '6px' }} />
                </div>
                <div className="absolute top-[35%] right-[20%] rounded-full bg-white border border-black flex items-center justify-center" style={{ width: '12px', height: '12px' }}>
                  <div className="rounded-full bg-zinc-950 translate-x-0.5 translate-y-0.5" style={{ width: '6px', height: '6px' }} />
                </div>
                {/* Gants */}
                <div className="absolute bottom-[-3px] left-[-4px] rounded-full border-2 border-zinc-950 shadow-md" style={{ width: '20px', height: '20px', backgroundColor: p1Selection.gloveColorHex }} />
                <div className="absolute bottom-[-3px] right-[-4px] rounded-full border-2 border-zinc-950 shadow-md" style={{ width: '20px', height: '20px', backgroundColor: p1Selection.gloveColorHex }} />
              </div>
              
              <span className="text-xs font-black uppercase tracking-tight text-white">{p1Selection.name}</span>
              
              {/* Stats Ultra Compactes */}
              <div className="w-full flex flex-col gap-0.5 text-[8px] font-bold text-zinc-400">
                <div className="flex justify-between items-center"><span className="uppercase font-sans">HP</span><span className="text-red-400 font-mono">{p1Selection.maxHp}</span></div>
                <div className="w-full bg-zinc-900 h-0.5 rounded-full overflow-hidden"><div className="bg-red-500 h-full" style={{ width: `${(p1Selection.maxHp/120)*100}%` }} /></div>
                <div className="flex justify-between items-center"><span className="uppercase font-sans">SPD</span><span className="text-cyan-400 font-mono">{p1Selection.speed.toFixed(1)}</span></div>
                <div className="w-full bg-zinc-900 h-0.5 rounded-full overflow-hidden"><div className="bg-cyan-500 h-full" style={{ width: `${(p1Selection.speed/5.5)*100}%` }} /></div>
                <div className="flex justify-between items-center"><span className="uppercase font-sans">PWR</span><span className="text-orange-400 font-mono">{p1Selection.power}</span></div>
                <div className="w-full bg-zinc-900 h-0.5 rounded-full overflow-hidden"><div className="bg-orange-500 h-full" style={{ width: `${(p1Selection.power/10)*100}%` }} /></div>
              </div>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-zinc-600 text-[10px] font-bold uppercase italic">En attente...</div>
          )}
        </div>

        {/* COLONNE CENTRALE - GRILLE DE CHOIX HORIZONTALE & BOUTON COMBAT */}
        <div className="flex flex-col items-center gap-3 w-full justify-center">
          {/* Grille Horizontale Compacte */}
          <div className="flex flex-row justify-center gap-3 bg-slate-950-60 border border-white-10 p-3 rounded-2xl backdrop-blur-xl w-full justify-center">
            {CHARACTERS.map((char) => {
              const isSelectedByP1 = p1Selection?.id === char.id;
              const isSelectedByP2 = p2Selection?.id === char.id;
              const isSelected = isSelectedByP1 || isSelectedByP2;

              return (
                <div
                  key={char.id}
                  onClick={() => selectCharacter(char)}
                  onMouseEnter={playHoverSound}
                  className={`cursor-pointer rounded-xl border flex items-center justify-center transition-all duration-200 transform hover:scale-105 active:scale-95 relative overflow-hidden ${
                    isSelectedByP1
                      ? 'border-pink-500 bg-pink-950-20'
                      : isSelectedByP2
                        ? 'border-cyan-500 bg-cyan-950-20'
                        : 'border-white-10 bg-slate-900 hover:border-pink-500-30'
                  }`}
                  style={{
                    width: '70px',
                    height: '70px',
                    boxShadow: isSelected ? (isSelectedByP1 ? '0 0 12px rgba(219,39,119,0.4)' : '0 0 12px rgba(6,182,212,0.4)') : 'none'
                  }}
                >
                  {/* Portrait réduit du perso */}
                  <div className="rounded-full border border-zinc-950 flex items-center justify-center relative" style={{ width: '46px', height: '46px', backgroundColor: char.colorHex }}>
                    <div className="absolute top-[35%] left-[20%] rounded-full bg-white border border-black flex items-center justify-center" style={{ width: '8px', height: '8px' }}>
                      <div className="rounded-full bg-zinc-950 translate-x-px translate-y-px" style={{ width: '4px', height: '4px' }} />
                    </div>
                    <div className="absolute top-[35%] right-[20%] rounded-full bg-white border border-black flex items-center justify-center" style={{ width: '8px', height: '8px' }}>
                      <div className="rounded-full bg-zinc-950 translate-x-px translate-y-px" style={{ width: '4px', height: '4px' }} />
                    </div>
                  </div>
                  {/* Badge */}
                  {isSelectedByP1 && <span className="absolute bottom-1 left-1 bg-pink-600 text-white text-[8px] font-black px-1 rounded-sm">J1</span>}
                  {isSelectedByP2 && <span className="absolute bottom-1 right-1 bg-cyan-600 text-white text-[8px] font-black px-1 rounded-sm">{gameMode === 'solo' ? 'IA' : 'J2'}</span>}
                </div>
              );
            })}
          </div>

          {/* Bouton de Combat Compact */}
          <div className="w-full flex justify-center min-h-[36px]">
            {p1Selection && p2Selection ? (
              <button
                onClick={handleStartFight}
                className="w-full py-2.5 px-4 rounded-xl text-white font-black text-[10px] uppercase tracking-wider transition-all duration-200 hover:scale-103 active:scale-97 border border-white-10"
                style={{
                  background: 'linear-gradient(to right, var(--pink-500), var(--red-500))',
                  boxShadow: '0 4px 15px rgba(239,68,68,0.3)',
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: 50
                }}
              >
                Combattre !
              </button>
            ) : (
              <div className="text-[9px] font-black text-zinc-600 italic tracking-wider uppercase">Sélectionner</div>
            )}
          </div>
        </div>

        {/* COLONNE DROITE - PORTRAIT ET STATS JOUEUR 2 / IA */}
        <div className="flex flex-col items-center gap-2 bg-slate-950-60 border border-cyan-500-30 p-3 rounded-2xl backdrop-blur-xl w-full min-h-[180px] justify-between relative overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-cyan-500-5 pointer-events-none" />
          <span className="text-[9px] text-cyan-400 font-black uppercase tracking-widest">{gameMode === 'solo' ? 'IA' : 'Joueur 2'}</span>
          
          {p2Selection ? (
            <div className="flex flex-col items-center gap-1.5 w-full animate-scale-up">
              {/* Portrait compact */}
              <div className="rounded-full border-3 border-cyan-500 flex items-center justify-center bg-slate-900 shadow-md relative animate-bounce-subtle" style={{ width: '70px', height: '70px', backgroundColor: p2Selection.colorHex }}>
                {/* Yeux */}
                <div className="absolute top-[35%] left-[20%] rounded-full bg-white border border-black flex items-center justify-center" style={{ width: '12px', height: '12px' }}>
                  <div className="rounded-full bg-zinc-950 translate-x-0.5 translate-y-0.5" style={{ width: '6px', height: '6px' }} />
                </div>
                <div className="absolute top-[35%] right-[20%] rounded-full bg-white border border-black flex items-center justify-center" style={{ width: '12px', height: '12px' }}>
                  <div className="rounded-full bg-zinc-950 translate-x-0.5 translate-y-0.5" style={{ width: '6px', height: '6px' }} />
                </div>
                {/* Gants */}
                <div className="absolute bottom-[-3px] left-[-4px] rounded-full border-2 border-zinc-950 shadow-md" style={{ width: '20px', height: '20px', backgroundColor: p2Selection.gloveColorHex }} />
                <div className="absolute bottom-[-3px] right-[-4px] rounded-full border-2 border-zinc-950 shadow-md" style={{ width: '20px', height: '20px', backgroundColor: p2Selection.gloveColorHex }} />
              </div>
              
              <span className="text-xs font-black uppercase tracking-tight text-white">{p2Selection.name}</span>
              
              {/* Stats Ultra Compactes */}
              <div className="w-full flex flex-col gap-0.5 text-[8px] font-bold text-zinc-400">
                <div className="flex justify-between items-center"><span className="uppercase font-sans">HP</span><span className="text-red-400 font-mono">{p2Selection.maxHp}</span></div>
                <div className="w-full bg-zinc-900 h-0.5 rounded-full overflow-hidden"><div className="bg-red-500 h-full" style={{ width: `${(p2Selection.maxHp/120)*100}%` }} /></div>
                <div className="flex justify-between items-center"><span className="uppercase font-sans">SPD</span><span className="text-cyan-400 font-mono">{p2Selection.speed.toFixed(1)}</span></div>
                <div className="w-full bg-zinc-900 h-0.5 rounded-full overflow-hidden"><div className="bg-cyan-500 h-full" style={{ width: `${(p2Selection.speed/5.5)*100}%` }} /></div>
                <div className="flex justify-between items-center"><span className="uppercase font-sans">PWR</span><span className="text-orange-400 font-mono">{p2Selection.power}</span></div>
                <div className="w-full bg-zinc-900 h-0.5 rounded-full overflow-hidden"><div className="bg-orange-500 h-full" style={{ width: `${(p2Selection.power/10)*100}%` }} /></div>
              </div>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-zinc-600 text-[10px] font-bold uppercase italic">En attente...</div>
          )}
        </div>

      </div>

      {/* Petit espaceur pour équilibrer le layout verticalement */}
      <div className="h-4" />
    </div>
  );
};
