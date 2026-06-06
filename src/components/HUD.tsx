/**
 * HUD.tsx
 * Affiche l'interface utilisateur en superposition du combat :
 * jauges de vie fluides, jauges de super néon, chronomètre central et compteur d'impacts.
 */

import React, { useEffect, useState } from 'react';
import { Pause, Play, Flame, Gamepad, Volume2, VolumeX } from 'lucide-react';

interface HUDProps {
  p1Name: string;
  p2Name: string;
  p1ColorHex: string;
  p2ColorHex: string;
  p1MaxHp: number;
  p2MaxHp: number;
  p1Hp: number;
  p2Hp: number;
  p1Rage: number;
  p2Rage: number;
  p1Combo: number;
  p2Combo: number;
  gameTime: number;
  isPaused: boolean;
  onTogglePause: () => void;
  showMobileControls: boolean;
  onToggleMobileControls: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  p1Name,
  p2Name,
  p1ColorHex,
  p2ColorHex,
  p1MaxHp,
  p2MaxHp,
  p1Hp,
  p2Hp,
  p1Rage,
  p2Rage,
  p1Combo,
  p2Combo,
  gameTime,
  isPaused,
  onTogglePause,
  showMobileControls,
  onToggleMobileControls,
  soundEnabled,
  onToggleSound,
}) => {
  // Valeurs atténuées (pour les barres de vie avec délai "red damage bar")
  const [p1HpDelayed, setP1HpDelayed] = useState(p1Hp);
  const [p2HpDelayed, setP2HpDelayed] = useState(p2Hp);

  // Mettre à jour les barres retardées de manière fluide
  useEffect(() => {
    const timer = setTimeout(() => {
      if (p1HpDelayed > p1Hp) {
        setP1HpDelayed(Math.max(p1Hp, p1HpDelayed - 1));
      } else if (p1HpDelayed < p1Hp) {
        setP1HpDelayed(p1Hp);
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [p1Hp, p1HpDelayed]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (p2HpDelayed > p2Hp) {
        setP2HpDelayed(Math.max(p2Hp, p2HpDelayed - 1));
      } else if (p2HpDelayed < p2Hp) {
        setP2HpDelayed(p2Hp);
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [p2Hp, p2HpDelayed]);

  // Pourcentages
  const p1HpPercent = (p1Hp / p1MaxHp) * 100;
  const p1HpDelayedPercent = (p1HpDelayed / p1MaxHp) * 100;
  const p2HpPercent = (p2Hp / p2MaxHp) * 100;
  const p2HpDelayedPercent = (p2HpDelayed / p2MaxHp) * 100;

  const p1RagePercent = (p1Rage / 100) * 100;
  const p2RagePercent = (p2Rage / 100) * 100;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 select-none font-sans z-50" style={{ zIndex: 9999 }}>
      
      {/* Barre supérieure : Vie, Rage et Timer */}
      <div className="flex justify-between items-center w-full relative z-20">
        
        {/* JOUEUR 1 HUD (Gauche) */}
        <div className="flex flex-col w-p35 gap-1">
          {/* Nom du Joueur 1 */}
          <div className="flex items-center justify-between text-white font-black uppercase text-sm tracking-widest" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>
            <span style={{ color: p1ColorHex }}>{p1Name}</span>
            <span className="font-mono text-xs opacity-75">{Math.round(p1Hp * 10) / 10}/{p1MaxHp} HP</span>
          </div>

          {/* Jauge de Vie Joueur 1 */}
          <div className="w-full h-5 bg-black-50 border border-white-10 rounded-lg overflow-hidden relative shadow-inset-hud">
            {/* Barre de retard (Jaune/Orange de dégât) */}
            <div
              className="absolute top-0 right-0 h-full transition-all duration-75"
              style={{ 
                width: `${p1HpDelayedPercent}%`,
                background: 'linear-gradient(to left, var(--orange-600), var(--orange-400))'
              }}
            />
            {/* Barre principale de vie (Verte) */}
            <div
              className="absolute top-0 right-0 h-full transition-all duration-75"
              style={{ 
                width: `${p1HpPercent}%`,
                background: 'linear-gradient(to left, var(--emerald-400), #059669)',
                boxShadow: '0 0 10px rgba(16,185,129,0.5)'
              }}
            />
          </div>

          {/* Jauge de Super/Rage Joueur 1 */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <Flame
              size={12}
              className={`transition-colors duration-300 ${
                p1Rage >= 100 ? 'text-orange-500 animate-pulse' : 'text-zinc-500'
              }`}
            />
            <div className="flex-1 h-2 bg-black-40 border border-white-5 rounded-full overflow-hidden relative">
              <div
                className={`h-full transition-all duration-150 ${
                  p1Rage >= 100 ? 'animate-pulse' : ''
                }`}
                style={{ 
                  width: `${p1RagePercent}%`,
                  background: p1Rage >= 100 
                    ? 'linear-gradient(to right, var(--orange-500), var(--yellow-500))' 
                    : 'linear-gradient(to right, var(--pink-500), var(--red-500))',
                  boxShadow: p1Rage >= 100 ? '0 0 8px rgba(249,115,22,0.8)' : 'none'
                }}
              />
            </div>
            {p1Rage >= 100 && (
              <span 
                className="text-9px font-black text-orange-400 uppercase tracking-widest animate-pulse"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
              >
                SUPER !
              </span>
            )}
          </div>
        </div>

        {/* TIMER CENTRAL */}
        <div className="flex flex-col items-center justify-center relative">
          {/* Cercle d'horloge stylé */}
          <div className="w-16 h-16 rounded-full bg-slate-950-80 border-3 border-pink-500-30 flex items-center justify-center shadow-glow-over relative">
            <div 
              className="absolute inset-0-5 rounded-full border border-white-5 pointer-events-none" 
              style={{ background: 'radial-gradient(circle at center, rgba(147,51,234,0.15) 0%, transparent 70%)' }}
            />
            <span className="text-3xl font-mono font-black text-pink-400" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
              {gameTime}
            </span>
          </div>

          {/* Boutons utilitaires regroupés au centre */}
          <div className="flex items-center gap-1.5 mt-2 pointer-events-auto">
            <button
              onClick={onToggleMobileControls}
              className={`p-1 rounded-lg border transition-all duration-200 flex items-center justify-center ${showMobileControls ? 'bg-pink-600 border-pink-500 text-white' : 'bg-slate-900-60 border-white-10 text-zinc-400 hover:text-white hover:bg-slate-800'}`}
              title="Contrôles tactiles (Mobile)"
              style={{ width: '26px', height: '26px' }}
            >
              <Gamepad size={13} />
            </button>
            
            <button
              onClick={onTogglePause}
              className="p-1 rounded-lg bg-slate-900-60 border border-white-10 text-zinc-400 hover:text-white hover:bg-slate-800 transition-all duration-200 flex items-center justify-center"
              title={isPaused ? 'Reprendre' : 'Pause'}
              style={{ width: '26px', height: '26px' }}
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
            </button>

            <button
              onClick={onToggleSound}
              className="p-1 rounded-lg bg-slate-900-60 border border-white-10 text-zinc-400 hover:text-white hover:bg-slate-800 transition-all duration-200 flex items-center justify-center"
              title={soundEnabled ? 'Couper le son' : 'Activer le son'}
              style={{ width: '26px', height: '26px' }}
            >
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>
          </div>
        </div>

        {/* JOUEUR 2 HUD (Droite) */}
        <div className="flex flex-col w-p35 gap-1">
          {/* Nom du Joueur 2 */}
          <div className="flex items-center justify-between text-white font-black uppercase text-sm tracking-widest" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>
            <span className="font-mono text-xs opacity-75">{Math.round(p2Hp * 10) / 10}/{p2MaxHp} HP</span>
            <span style={{ color: p2ColorHex }}>{p2Name}</span>
          </div>

          {/* Jauge de Vie Joueur 2 */}
          <div className="w-full h-5 bg-black-50 border border-white-10 rounded-lg overflow-hidden relative shadow-inset-hud">
            {/* Barre de retard (Jaune/Orange de dégât) */}
            <div
              className="absolute top-0 left-0 h-full transition-all duration-75"
              style={{ 
                width: `${p2HpDelayedPercent}%`,
                background: 'linear-gradient(to right, var(--orange-600), var(--orange-400))'
              }}
            />
            {/* Barre principale de vie (Verte) */}
            <div
              className="absolute top-0 left-0 h-full transition-all duration-75"
              style={{ 
                width: `${p2HpPercent}%`,
                background: 'linear-gradient(to right, var(--emerald-400), #059669)',
                boxShadow: '0 0 10px rgba(16,185,129,0.5)'
              }}
            />
          </div>

          {/* Jauge de Super/Rage Joueur 2 */}
          <div className="flex items-center gap-1.5 mt-0.5 justify-end">
            {p2Rage >= 100 && (
              <span 
                className="text-9px font-black text-orange-400 uppercase tracking-widest animate-pulse"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
              >
                SUPER !
              </span>
            )}
            <div className="flex-1 h-2 bg-black-40 border border-white-5 rounded-full overflow-hidden relative">
              <div
                className={`h-full transition-all duration-150 ml-auto ${
                  p2Rage >= 100 ? 'animate-pulse' : ''
                }`}
                style={{ 
                  width: `${p2RagePercent}%`,
                  background: p2Rage >= 100 
                    ? 'linear-gradient(to left, var(--orange-500), var(--yellow-500))' 
                    : 'linear-gradient(to left, var(--pink-500), var(--red-500))',
                  boxShadow: p2Rage >= 100 ? '0 0 8px rgba(249,115,22,0.8)' : 'none'
                }}
              />
            </div>
            <Flame
              size={12}
              className={`transition-colors duration-300 ${
                p2Rage >= 100 ? 'text-orange-500 animate-pulse' : 'text-zinc-500'
              }`}
            />
          </div>
        </div>

      </div>

      {/* Partie basse : Infos combos de coups (si actif) */}
      <div className="flex justify-between items-end w-full mb-12">
        {/* Combo Joueur 1 */}
        <div className="h-10">
          {p1Combo > 0 && (
            <div 
              className="animate-scale-up py-1-5 px-3-5 rounded-xl bg-pink-500-20 border border-pink-500-40 text-pink-400 font-black text-xs uppercase tracking-wider flex items-center gap-1.5"
              style={{ boxShadow: '0 5px 15px rgba(239,68,68,0.15)' }}
            >
              <span>🔥 COMBO ACTIVE !</span>
            </div>
          )}
        </div>

        {/* Combo Joueur 2 */}
        <div className="h-10">
          {p2Combo > 0 && (
            <div 
              className="animate-scale-up py-1-5 px-3-5 rounded-xl bg-pink-500-20 border border-pink-500-40 text-pink-400 font-black text-xs uppercase tracking-wider flex items-center gap-1.5"
              style={{ boxShadow: '0 5px 15px rgba(239,68,68,0.15)' }}
            >
              <span>🔥 COMBO ACTIVE !</span>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
};
