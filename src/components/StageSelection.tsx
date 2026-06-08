/**
 * StageSelection.tsx
 * Composant de sélection de l'arène de combat (Stage).
 * Offre un design arcade premium avec previews géantes et effets néon.
 */

import React, { useState } from 'react';
import { ArrowLeft, Swords, MapPin } from 'lucide-react';
import { soundManager } from '../game/SoundManager';

export interface Stage {
  id: string;
  name: string;
  description: string;
  imagePath: string;
}

export const STAGES: Stage[] = [
  {
    id: 'el_ring',
    name: 'El Ring',
    description: 'Le ring de combat classique sous les projecteurs, entouré de supporters en effervescence.',
    imagePath: '/assets/images/ring_background.png'
  },
  {
    id: 'el_houma',
    name: 'El Houma',
    description: 'Un quartier populaire d\'Alger avec son architecture traditionnelle, ses balcons colorés et son ambiance chaleureuse.',
    imagePath: '/assets/images/el_houma_background.png'
  },
  {
    id: 'la_plage',
    name: 'La Plage',
    description: 'Une plage de sable fin sous un coucher de soleil méditerranéen envoûtant, bercée par des vagues calmes et un feu de camp.',
    imagePath: '/assets/images/la_plage_background.png'
  }
];

interface StageSelectionProps {
  onBack: () => void;
  onStageSelected: (stage: Stage) => void;
}

export const StageSelection: React.FC<StageSelectionProps> = ({ onBack, onStageSelected }) => {
  const [selectedStage, setSelectedStage] = useState<Stage>(STAGES[0]);

  const handleSelect = (stage: Stage) => {
    if (stage.id !== selectedStage.id) {
      setSelectedStage(stage);
      soundManager.play('countdown', { volumeScale: 0.3, pitchVariation: 0.05 });
    }
  };

  const handleConfirm = () => {
    soundManager.play('fight');
    onStageSelected(selectedStage);
  };

  const playHoverSound = () => {
    soundManager.play('countdown', { volumeScale: 0.15, pitchVariation: 0.02 });
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-slate-950 text-white overflow-hidden p-4">
      {/* Conteneur principal 16:9 arcade */}
      <div 
        className="relative flex flex-col justify-between w-full max-w-4xl p-6 rounded-3xl bg-slate-900-60 border border-white-10 backdrop-blur-xl shadow-box-menu"
        style={{
          aspectRatio: '16 / 9',
          minHeight: '480px'
        }}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between w-full border-b border-white-10 pb-3">
          <button
            onClick={onBack}
            onMouseEnter={playHoverSound}
            className="flex items-center gap-2 py-1.5 px-3.5 rounded-xl bg-white-5 hover:bg-white-10 border border-white-10 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 active-scale-98"
          >
            <ArrowLeft size={14} />
            Retour
          </button>
          
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-400 select-none animate-pulse">
            Sélection de l'Arène
          </h2>
          
          <div className="w-[85px] hidden md:block" /> {/* Équilibreur visuel */}
        </div>

        {/* Corps de sélection (Grid à 2 colonnes) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1 my-4 overflow-hidden">
          {/* Colonne gauche (Cartes des arènes) */}
          <div className="md:col-span-2 flex flex-col gap-2.5 justify-center overflow-y-auto pr-1">
            {STAGES.map((stage) => {
              const isSelected = stage.id === selectedStage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => handleSelect(stage)}
                  onMouseEnter={playHoverSound}
                  className={`relative flex items-center gap-3 p-3 rounded-2xl border text-left transition-all duration-300 hover-scale-102 ${
                    isSelected 
                      ? 'border-pink-500 text-white shadow-[0_0_15px_rgba(219,39,119,0.25)]' 
                      : 'bg-white-5 border-white-5 text-zinc-400 hover:text-zinc-200'
                  }`}
                  style={isSelected ? {
                    background: 'linear-gradient(to right, rgba(219, 39, 119, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)'
                  } : {}}
                >
                  {/* Miniature ou indicateur */}
                  <div className={`w-12 h-12 rounded-lg overflow-hidden border ${isSelected ? 'border-pink-400' : 'border-white-10'}`}>
                    <img 
                      src={stage.imagePath} 
                      alt={stage.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black uppercase tracking-wider">{stage.name}</h3>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">{stage.description}</p>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-pink-600 rounded-full p-0.5 animate-bounce">
                      <MapPin size={10} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Colonne droite (Grand Preview & Description) */}
          <div className="md:col-span-3 flex flex-col rounded-2xl border border-white-10 overflow-hidden bg-slate-950-40 relative group">
            {/* Image de Preview géante */}
            <div className="flex-1 relative overflow-hidden">
              <img 
                src={selectedStage.imagePath} 
                alt={selectedStage.name} 
                className="w-full h-full object-cover transition-transform duration-700 scale-102 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950-30 to-transparent" />
            </div>

            {/* Infos Arène */}
            <div className="p-4 bg-slate-950-80 backdrop-blur-md border-t border-white-5 relative z-10">
              <span className="text-[9px] font-black uppercase tracking-widest text-pink-400 bg-pink-500-10 border border-pink-500-20 px-2 py-0.5 rounded">
                Arène Sélectionnée
              </span>
              <h3 className="text-lg font-black uppercase tracking-wider text-white mt-1.5 flex items-center gap-1.5">
                {selectedStage.name}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                {selectedStage.description}
              </p>
            </div>
          </div>
        </div>

        {/* Pied de page & Lancement */}
        <div className="flex justify-end border-t border-white-10 pt-3">
          <button
            onClick={handleConfirm}
            onMouseEnter={playHoverSound}
            className="flex items-center justify-center gap-2 py-3 px-8 rounded-2xl text-white font-black text-sm uppercase tracking-widest transition-all duration-300 hover-scale-102 active-scale-98 border border-white-10"
            style={{
              background: 'linear-gradient(to right, var(--pink-500), var(--red-500))',
              boxShadow: '0 6px 20px rgba(239, 68, 68, 0.25)'
            }}
          >
            <Swords size={16} />
            Lancer le combat
          </button>
        </div>
      </div>
    </div>
  );
};
