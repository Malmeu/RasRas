/**
 * StageSelection.tsx
 * Composant simplifié et robuste de sélection de l'arène.
 * Affiche les 3 arènes côte à côte sous forme de cartes claires et sélectionnables.
 * Utilise uniquement les classes de index.css et des styles inline pour éviter les bugs CSS.
 */

import React, { useState } from 'react';
import { ArrowLeft, Swords } from 'lucide-react';
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
    description: 'Le ring de combat classique entouré de supporters passionnés.',
    imagePath: 'assets/images/ring_background.png'
  },
  {
    id: 'el_houma',
    name: 'El Houma',
    description: 'Un quartier traditionnel d\'Alger sous le coucher de soleil.',
    imagePath: 'assets/images/el_houma_background.png'
  },
  {
    id: 'la_plage',
    name: 'La Plage',
    description: 'Une plage de sable fin bercée par un feu de camp de nuit.',
    imagePath: 'assets/images/la_plage_background.png'
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
      soundManager.play('punch', { pitchVariation: 0.1 });
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
    <div 
      className="flex flex-col items-center justify-between min-h-screen text-white p-4 relative overflow-hidden bg-slate-950" 
      style={{ backgroundImage: 'radial-gradient(circle at bottom, var(--bg-purple-950) 0%, var(--bg-slate-950) 100%)' }}
    >
      {/* Grille de fond décorative */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20" 
        style={{ 
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)', 
          backgroundSize: '30px 30px' 
        }} 
      />

      {/* Barre supérieure : Bouton Retour et Titre */}
      <div className="w-full flex items-center justify-between relative z-10 mb-4" style={{ maxWidth: '900px' }}>
        <button
          onClick={onBack}
          onMouseEnter={playHoverSound}
          className="flex items-center gap-1-5 py-1-5 px-3 rounded-xl bg-white-5 hover-scale-102 active-scale-98 transition-all duration-200 text-zinc-300 font-bold uppercase tracking-wider text-xs border"
        >
          <ArrowLeft size={14} />
          Retour
        </button>
        
        <h2 
          className="text-xl font-black uppercase tracking-widest"
          style={{ 
            background: 'linear-gradient(to right, var(--pink-400), var(--red-400))', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}
        >
          Sélection de l'Arène
        </h2>
        
        {/* Équilibreur visuel pour le titre centré */}
        <div style={{ width: '85px' }} />
      </div>

      {/* Liste des 3 Arènes côte à côte */}
      <div 
        className="grid grid-cols-3 gap-4 relative z-10 w-full"
        style={{ maxWidth: '900px', margin: 'auto 0' }}
      >
        {STAGES.map((stage) => {
          const isSelected = stage.id === selectedStage.id;
          return (
            <button
              key={stage.id}
              onClick={() => handleSelect(stage)}
              onMouseEnter={playHoverSound}
              className="flex flex-col rounded-2xl border transition-all duration-300 relative hover-scale-102 text-left"
              style={{
                borderColor: isSelected ? 'var(--pink-500)' : 'var(--border-white-10)',
                boxShadow: isSelected ? '0 0 25px rgba(236, 72, 153, 0.4)' : 'none',
                backgroundColor: isSelected ? 'var(--bg-slate-900)' : 'rgba(15, 15, 22, 0.4)',
                cursor: 'pointer',
                overflow: 'hidden'
              }}
            >
              {/* Image d'aperçu de l'arène */}
              <div style={{ height: '180px', overflow: 'hidden', position: 'relative' }}>
                <img 
                  src={stage.imagePath} 
                  alt={stage.name} 
                  className="w-full h-full"
                  style={{ 
                    objectFit: 'cover',
                    transition: 'transform 0.5s ease',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1.0)'
                  }}
                />
                
                {/* Dégradé sur l'image */}
                <div 
                  className="absolute inset-0" 
                  style={{ background: 'linear-gradient(to top, rgba(15, 15, 22, 0.95) 0%, rgba(15, 15, 22, 0.2) 60%, transparent 100%)' }} 
                />
                
                {/* Badge Sélectionné */}
                {isSelected && (
                  <div 
                    className="absolute font-black uppercase tracking-wider text-white text-9px rounded px-2 py-1"
                    style={{ 
                      top: '12px', 
                      right: '12px', 
                      backgroundColor: 'var(--pink-600)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                    }}
                  >
                    Actif
                  </div>
                )}
              </div>

              {/* Contenu textuel descriptif */}
              <div className="p-4 flex flex-col justify-between flex-1" style={{ minHeight: '120px' }}>
                <div>
                  <h3 
                    className="text-sm font-black uppercase tracking-wider"
                    style={{ color: isSelected ? '#ffffff' : 'var(--zinc-300)' }}
                  >
                    {stage.name}
                  </h3>
                  <p 
                    className="text-xs mt-2"
                    style={{ color: 'var(--zinc-400)', lineHeight: '1.4' }}
                  >
                    {stage.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Zone de validation en bas */}
      <div className="w-full flex justify-center relative z-10 mt-6" style={{ maxWidth: '900px' }}>
        <button
          onClick={handleConfirm}
          onMouseEnter={playHoverSound}
          className="flex items-center justify-center gap-2 py-3 px-8 rounded-xl text-white font-black text-sm uppercase tracking-widest transition-all duration-200 hover-scale-102 active-scale-98"
          style={{
            background: 'linear-gradient(to right, var(--pink-500), var(--red-500))',
            boxShadow: '0 6px 20px rgba(239, 68, 68, 0.35)',
            cursor: 'pointer'
          }}
        >
          <Swords size={16} />
          Lancer le combat
        </button>
      </div>
    </div>
  );
};

