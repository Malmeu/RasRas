/**
 * GameCanvas.tsx
 * Composant React qui initialise l'application PixiJS v8 et orchestre la boucle de jeu principale.
 * Gère le ring de combat, les collisions, l'IA, les effets juteux et communique les états de jeu à l'interface React.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Assets, Sprite, Text } from 'pixi.js';
import { Fighter } from '../game/Fighter';
import type { FighterConfig } from '../game/Fighter';
import { ParticleSystem } from '../game/ParticleSystem';
import { inputManager } from '../game/Input';
import { soundManager } from '../game/SoundManager';

interface GameCanvasProps {
  gameMode: 'solo' | 'versus' | 'online';
  difficulty: 'easy' | 'normal' | 'hard';
  player1Character: any; // caractéristiques du joueur 1
  player2Character: any; // caractéristiques du joueur 2 / IA
  onGameDataUpdate: (data: {
    p1Hp: number;
    p2Hp: number;
    p1Rage: number;
    p2Rage: number;
    p1Combo: number;
    p2Combo: number;
    gameTime: number;
    isKO: boolean;
  }) => void;
  onGameOver: (winnerName: string) => void;
  isPaused: boolean;
  socket?: any;
  onlineRole?: 'host' | 'client' | null;
  roomCode?: string;
  isMobile?: boolean;
}

interface DroppedItem {
  type: 'baseball_bat' | 'knife' | 'bottle';
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  z: number;
  vz: number;
  vx: number;
  vy: number;
  isAirborne: boolean;
  rotationSpeed: number;
  shadow: Graphics;
  graphic: Graphics;
}

interface CrowdMember {
  container: Container;
  x: number;
  y: number;
  color: number;
  phase: number;
  body: Graphics;
  eyeL: Graphics;
  eyeR: Graphics;
  flagContainer?: Container;
  fumigeneColor?: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameMode,
  difficulty,
  player1Character,
  player2Character,
  onGameDataUpdate,
  onGameOver,
  isPaused,
  socket,
  onlineRole,
  roomCode,
  isMobile = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Références muables pour éviter de recréer la boucle de jeu à chaque rendu React
  const stateRef = useRef({
    isPaused,
    gameTime: 99, // 99 secondes par round
    gameOverTriggered: false,
    cameraShake: 0,
    slowMoFactor: 1.0,
    slowMoTimer: 0,
  });

  // Mettre à jour l'état de pause
  useEffect(() => {
    stateRef.current.isPaused = isPaused;
  }, [isPaused]);

  useEffect(() => {
    let active = true;
    let app: Application | null = null;
    let particles: ParticleSystem | null = null;
    let p1: Fighter | null = null;
    let p2: Fighter | null = null;
    let itemContainer: Container | null = null;
    const droppedItems: DroppedItem[] = [];
    const crowdMembers: CrowdMember[] = [];
    const activeBubbles: { container: Container; timer: number; maxTime: number; supporterIndex: number; }[] = [];

    // Dimensions du canvas (dynamiques sur mobile plein écran)
    const width = isMobile ? window.innerWidth : 800;
    const height = isMobile ? window.innerHeight : 550;

    // Dimensions physiques constantes du ring pour conserver le gameplay d'origine
    const ringWidth = 464;
    const ringHeight = 325;

    // Centre du Ring de combat
    const ringCenter = { x: width / 2, y: height / 2 + 10 };

    // Limites physiques du ring
    const leftLimit = ringCenter.x - ringWidth / 2;
    const rightLimit = ringCenter.x + ringWidth / 2;
    const topLimit = ringCenter.y - ringHeight / 2;
    const bottomLimit = ringCenter.y + ringHeight / 2;

    async function initPixi() {
      console.log('[GameCanvas] initPixi démarré. gameMode:', gameMode, 'socket connecté:', socket?.connected, 'socket ID:', socket?.id, 'onlineRole:', onlineRole, 'roomCode:', roomCode);
      try {
        // 1. Initialiser PixiJS App (asynchrone en v8)
        app = new Application();
        await app.init({
          width,
          height,
          antialias: true,
          backgroundColor: 0x12121c, // Fond sombre violet haut de gamme
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        if (!active) {
          try {
            if (app.renderer) {
              app.destroy(true, { children: true });
            }
          } catch (e) {
            console.warn("Erreur lors de la destruction précoce de PixiJS:", e);
          }
          return;
        }

        if (containerRef.current) {
          containerRef.current.innerHTML = ''; // Nettoyer pour éviter les doublons de canvas (StrictMode)
          app.canvas.style.position = 'absolute';
          app.canvas.style.width = '100%';
          app.canvas.style.height = '100%';
          app.canvas.style.top = '0';
          app.canvas.style.left = '0';
          app.canvas.style.zIndex = '1';
          containerRef.current.appendChild(app.canvas);
        }

      // 2. Créer les conteneurs
      const worldContainer = new Container();
      app.stage.addChild(worldContainer);

      const backgroundContainer = new Container();
      const crowdContainer = new Container();
      const ringContainer = new Container();
      itemContainer = new Container();
      const fighterContainer = new Container();
      const effectContainer = new Container();
      const speechBubbleContainer = new Container();

      worldContainer.addChild(backgroundContainer);
      worldContainer.addChild(ringContainer);
      worldContainer.addChild(itemContainer);
      worldContainer.addChild(fighterContainer);
      worldContainer.addChild(effectContainer);
      worldContainer.addChild(speechBubbleContainer);

      // Créer les supporters autour du ring
      const crowdColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x14b8a6, 0x6366f1];
      // Supporters du haut (positionnés au-dessus du ring)
      for (let x = 40; x <= width - 40; x += 40) {
        const px = x + (Math.random() - 0.5) * 8;
        const py = topLimit - 28 + Math.random() * 5;
        const color = crowdColors[Math.floor(Math.random() * crowdColors.length)];
        crowdMembers.push(createCrowdMember(crowdContainer, px, py, color));
      }
      // Supporters du bas (positionnés en dessous du ring)
      for (let x = 40; x <= width - 40; x += 40) {
        const px = x + (Math.random() - 0.5) * 8;
        const py = bottomLimit + 30 + Math.random() * 5;
        const color = crowdColors[Math.floor(Math.random() * crowdColors.length)];
        crowdMembers.push(createCrowdMember(crowdContainer, px, py, color));
      }
      // Supporters de gauche (assis sur les bancs de gauche)
      for (let y = topLimit + 20; y <= bottomLimit - 20; y += 45) {
        const px = leftLimit - 58 + (Math.random() - 0.5) * 6;
        const py = y + (Math.random() - 0.5) * 8;
        const color = crowdColors[Math.floor(Math.random() * crowdColors.length)];
        crowdMembers.push(createCrowdMember(crowdContainer, px, py, color));
      }
      // Supporters de droite (assis sur les bancs de droite)
      for (let y = topLimit + 20; y <= bottomLimit - 20; y += 45) {
        const px = rightLimit + 58 + (Math.random() - 0.5) * 6;
        const py = y + (Math.random() - 0.5) * 8;
        const color = crowdColors[Math.floor(Math.random() * crowdColors.length)];
        crowdMembers.push(createCrowdMember(crowdContainer, px, py, color));
      }

      // Assigner des fumigènes (couleurs d'Algérie : vert, rouge, blanc) à 4 supporters aléatoires
      const numFumigenes = 4;
      const fumiColors = [0x10b981, 0xef4444, 0xffffff, 0x10b981];
      for (let i = 0; i < numFumigenes; i++) {
        if (crowdMembers.length > 0) {
          const idx = Math.floor(Math.random() * crowdMembers.length);
          crowdMembers[idx].fumigeneColor = fumiColors[i % fumiColors.length];
        }
      }

      // 3. Charger et dessiner l'image de fond du ring carré
      const bgTexture = await Assets.load('/assets/images/ring_background.png');
      if (!active) {
        try {
          if (app.renderer) {
            app.destroy(true, { children: true });
          }
        } catch (e) {}
        return;
      }
      const bgSprite = new Sprite(bgTexture);
      bgSprite.width = width;
      bgSprite.height = height;
      backgroundContainer.addChild(bgSprite);
      backgroundContainer.addChild(crowdContainer);

      // Créer le conteneur des cordes pour le tracé dynamique réactif
      const ringGraphics = new Graphics();
      ringContainer.addChild(ringGraphics);

      // 4. Initialiser le système de particules
      particles = new ParticleSystem(effectContainer);

      // 5. Configurer et créer les combattants
      let p1IsPlayer = true;
      let p2IsPlayer = gameMode === 'versus';
      let p1Layout = 'player1';
      let p2Layout = gameMode === 'versus' ? 'player2' : 'ai';

      if (gameMode === 'online') {
        if (onlineRole === 'host') {
          p1IsPlayer = true;
          p1Layout = 'player1';
          p2IsPlayer = false;
          p2Layout = 'network';
        } else {
          p1IsPlayer = false;
          p1Layout = 'network';
          p2IsPlayer = true;
          p2Layout = 'player1'; // Clavier P1 local pour le joueur 2 connecté
        }
      }

      const p1Config: FighterConfig = {
        name: player1Character.name,
        x: ringCenter.x - 100,
        y: ringCenter.y,
        color: player1Character.color,
        gloveColor: player1Character.gloveColor,
        speed: player1Character.speed,
        power: player1Character.power,
        defense: player1Character.defense,
        maxHp: player1Character.maxHp,
        isPlayer: p1IsPlayer,
        keyboardLayout: p1Layout as any,
      };

      const p2Config: FighterConfig = {
        name: player2Character.name,
        x: ringCenter.x + 100,
        y: ringCenter.y,
        color: player2Character.color,
        gloveColor: player2Character.gloveColor,
        speed: player2Character.speed,
        power: player2Character.power,
        defense: player2Character.defense,
        maxHp: player2Character.maxHp,
        isPlayer: p2IsPlayer,
        keyboardLayout: p2Layout as any,
      };

      p1 = new Fighter(p1Config, fighterContainer);
      p2 = new Fighter(p2Config, fighterContainer);

      p1.setParticleSystem(particles);
      p2.setParticleSystem(particles);

      // --- INITIALISATION DU SOCKET EN LIGNE (ÉCOUTEURS) ---
      let opponentTarget: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        rotation: number;
        state: any;
        hp: number;
        rage: number;
        weapon: any;
        weaponUses: number;
      } | null = null;

      if (gameMode === 'online' && socket) {
        console.log('[GameCanvas] Enregistrement des listeners de combat en ligne. Rôle:', onlineRole, 'Salon:', roomCode);
        socket.on('opponent_fighter_sync', (data: any) => {
          opponentTarget = data;
        });

        socket.on('opponent_hit', (data: any) => {
          const localFighter = onlineRole === 'host' ? p1 : p2;
          if (localFighter) {
            localFighter.takeDamage(data.damage, data.angle, data.isHeavy, data.kbForce);
          }
        });

        socket.on('item_spawned', (data: any) => {
          if (onlineRole === 'client') {
            spawnItem(data.type, data.startX, data.startY, data.targetX, data.targetY, data.launcherIndex);
          }
        });

        socket.on('opponent_item_picked', (data: any) => {
          const opponent = onlineRole === 'host' ? p2 : p1;
          const itemIdx = data.itemIndex;
          const item = droppedItems[itemIdx];
          if (item) {
            try {
              if (!item.shadow.destroyed) item.shadow.destroy();
              if (!item.graphic.destroyed) item.graphic.destroy();
            } catch (e) {}
            droppedItems.splice(itemIdx, 1);
          }

          if (opponent) {
            opponent.equipWeapon(data.itemType);
            soundManager.play('block', { pan: (opponent.x - ringCenter.x) / ringCenter.x, pitchVariation: 0.1, volumeScale: 1.0 });
          }
        });

        socket.on('game_time_sync', (data: any) => {
          if (onlineRole === 'client') {
            stateRef.current.gameTime = data.gameTime;
          }
        });

        socket.on('match_over', (data: any) => {
          if (onlineRole === 'client') {
            const winnerName = data.winnerRole === 'host' ? player1Character.name : data.winnerRole === 'client' ? player2Character.name : 'ÉGALITÉ !';
            triggerGameOver(winnerName);
          }
        });

        socket.on('opponent_left', (data: any) => {
          alert(data.message);
          triggerGameOver('Match Annulé');
        });
      }

      // Lancer la musique
      soundManager.playBGM();
      soundManager.play('fight');

      // 6. Boucle principale du jeu
      let secondTimer = 0;
      let cheerTimer = Math.random() * 8000 + 4000;
      let itemSpawnTimer = Math.random() * 10000 + 15000;
      let bubbleSpawnTimer = Math.random() * 2000 + 2000;
      let networkSendTimer = 0;

      app.ticker.add((ticker) => {
        const state = stateRef.current;
        if (state.isPaused || state.gameOverTriggered) return;

        // Gérer le ralenti (Slow-mo) de K.O.
        let dt = ticker.deltaTime;
        if (state.slowMoTimer > 0) {
          state.slowMoTimer -= ticker.elapsedMS;
          dt *= 0.25; // 4x plus lent
          soundManager.setBgmSpeed(0.65); // ralentir la musique
        } else {
          soundManager.setBgmSpeed(1.0);
        }

        // Chrono du jeu (toutes les secondes)
        if (state.slowMoTimer <= 0) {
          secondTimer += ticker.elapsedMS;
          if (secondTimer >= 1000) {
            secondTimer -= 1000;
            if (gameMode !== 'online' || onlineRole === 'host') {
              state.gameTime = Math.max(0, state.gameTime - 1);
              
              if (gameMode === 'online' && socket) {
                socket.emit('time_sync', { roomCode, gameTime: state.gameTime });
              }

              if (state.gameTime === 0 && !state.gameOverTriggered) {
                triggerGameOver('ÉGALITÉ !');
                if (gameMode === 'online' && socket) {
                  socket.emit('game_over', { roomCode, winnerRole: 'tie' });
                }
              }
            }
          }

          // Ambiance de la foule en arrière-plan
          cheerTimer -= ticker.elapsedMS;
          if (cheerTimer <= 0) {
            cheerTimer = Math.random() * 12000 + 12000;
            soundManager.play('cheer', { volumeScale: Math.random() * 0.12 + 0.04, pitchVariation: 0.15 });
          }

          // Lancer d'un objet par un spectateur (uniquement l'hôte en ligne, ou en local)
          if (gameMode !== 'online' || onlineRole === 'host') {
            itemSpawnTimer -= ticker.elapsedMS;
            if (itemSpawnTimer <= 0 && p1!.hp > 0 && p2!.hp > 0) {
              itemSpawnTimer = Math.random() * 15000 + 20000;
              
              const types: ('baseball_bat' | 'knife' | 'bottle')[] = ['baseball_bat', 'knife', 'bottle'];
              const type = types[Math.floor(Math.random() * types.length)];
              const targetX = Math.random() * ((rightLimit - 72) - (leftLimit + 72)) + (leftLimit + 72);
              const targetY = Math.random() * ((bottomLimit - 55) - (topLimit + 50)) + (topLimit + 50);
              
              let startX = ringCenter.x;
              let startY = height + 100; // Hors écran du bas
              let launcherIndex = -1;

              if (crowdMembers.length > 0) {
                launcherIndex = Math.floor(Math.random() * crowdMembers.length);
                const launcher = crowdMembers[launcherIndex];
                startX = launcher.x;
                startY = launcher.y;
              }

              spawnItem(type, startX, startY, targetX, targetY, launcherIndex);

              if (gameMode === 'online' && socket) {
                socket.emit('spawn_item', {
                  roomCode,
                  itemData: { type, startX, startY, targetX, targetY, launcherIndex }
                });
              }
            }
          }
        }

        // --- ENTRÉES CLAVIER & IA ---
        handlePlayerInputs(p1!, p2!);
        if (gameMode === 'solo') {
          handleAI(p2!, p1!, difficulty, dt);
        }

        // --- SYNCHRONISATION ADVERSAIRE EN LIGNE (APPLIQUER LES COORDONNEES REÇUES) ---
        if (gameMode === 'online' && opponentTarget) {
          const opponent = onlineRole === 'host' ? p2 : p1;
          if (opponent) {
            opponent.vx = (opponentTarget as any).vx;
            opponent.vy = (opponentTarget as any).vy;
            opponent.rotation = (opponentTarget as any).rotation;
            opponent.state = (opponentTarget as any).state;
            opponent.hp = (opponentTarget as any).hp;
            opponent.rage = (opponentTarget as any).rage;

            if ((opponentTarget as any).weapon) {
              if (opponent.equippedWeapon !== (opponentTarget as any).weapon) {
                opponent.equipWeapon((opponentTarget as any).weapon);
              }
              opponent.weaponUses = (opponentTarget as any).weaponUses;
            } else {
              opponent.clearWeapon();
            }
          }
        }

        // --- PHYSIQUE & COLLISION DU RING & UPDATE DE TOUS LES COMBATTANTS ---
        // On met à jour les deux combattants localement à chaque tick pour assurer la mise à jour fluide des animations
        p1!.update(dt, p2!.x, p2!.y);
        p2!.update(dt, p1!.x, p1!.y);

        if (gameMode === 'online') {
          // Pour l'adversaire réseau, on écrase son déplacement physique simulé en appliquant
          // l'interpolation (lerp) vers la position réseau réelle reçue.
          const opponent = onlineRole === 'host' ? p2 : p1;
          if (opponent && opponentTarget) {
            opponent.x += ((opponentTarget as any).x - opponent.x) * 0.35 * dt;
            opponent.y += ((opponentTarget as any).y - opponent.y) * 0.35 * dt;
            opponent.container.x = opponent.x;
            opponent.container.y = opponent.y;
          }

          // keepInRing uniquement pour son propre combattant en ligne
          if (onlineRole === 'host') {
            keepInRing(p1!);
          } else {
            keepInRing(p2!);
          }
        } else {
          keepInRing(p1!);
          keepInRing(p2!);
        }
        
        // Vibration des cordes du ring
        updateRingAnimation(ringGraphics, p1!, p2!);

        // Les collisions entre joueurs ne sont résolues que par l'hôte en ligne
        if (gameMode !== 'online' || onlineRole === 'host') {
          resolveFighterCollisions(p1!, p2!);
        }

        // --- MISE A JOUR DES OBJETS AU SOL ---
        updateDroppedItems(dt, droppedItems, p1!, p2!);

        // --- ANIMATION DE LA FOULE ---
        const timeNow = Date.now();
        crowdMembers.forEach(m => {
          const baseBounce = Math.sin(timeNow * 0.005 + m.phase) * 1.5;
          const excitement = cheerTimer < 3000 || p1!.state === 'ko' || p2!.state === 'ko' ? 3.5 : 0;
          const bounce = baseBounce + (excitement > 0 ? Math.sin(timeNow * 0.015 + m.phase) * excitement : 0);
          
          m.container.y = m.y + Math.min(0, bounce);
          
          // Léger squash & stretch
          const stretch = 1.0 - (bounce < 0 ? bounce * 0.03 : 0);
          const squash = 1.0 + (bounce < 0 ? bounce * 0.03 : 0);
          m.container.scale.set(squash, stretch);

          // Animer le drapeau tenu par le supporter (flottement dans le vent)
          if (m.flagContainer) {
            const waveSpeed = excitement > 0 ? 0.022 : 0.008;
            const waveAngle = excitement > 0 ? 0.45 : 0.22;
            m.flagContainer.rotation = Math.sin(timeNow * waveSpeed + m.phase) * waveAngle;
          }

          // Émettre de la fumée colorée si ce supporter tient un fumigène
          if (m.fumigeneColor && Math.random() < 0.12) {
            particles?.emitFumigeneSmoke(m.x, m.y - 15, m.fumigeneColor);
          }
        });

        // --- MISE A JOUR DES BULLES DE DIALOGUE ---
        for (let i = activeBubbles.length - 1; i >= 0; i--) {
          const ab = activeBubbles[i];
          ab.timer -= ticker.elapsedMS;
          
          if (ab.timer <= 0) {
            // Effet fade-out
            ab.container.alpha -= 0.08 * dt;
            if (ab.container.alpha <= 0) {
              speechBubbleContainer.removeChild(ab.container);
              ab.container.destroy({ children: true });
              activeBubbles.splice(i, 1);
            }
          } else {
            // Pop d'apparition (scale de 0 à 1)
            if (ab.container.scale.x < 1) {
              const nextScale = Math.min(1.0, ab.container.scale.x + 0.12 * dt);
              ab.container.scale.set(nextScale);
            }
            
            // La bulle suit la tête du supporter
            const m = crowdMembers[ab.supporterIndex];
            if (m) {
              ab.container.x = m.container.x;
              ab.container.y = m.y < ringCenter.y ? m.container.y + 12 : m.container.y - 12;
            }
          }
        }

        // Spawn périodique des bulles de dialogue du public
        bubbleSpawnTimer -= ticker.elapsedMS;
        if (bubbleSpawnTimer <= 0 && crowdMembers.length > 0 && activeBubbles.length < 2) {
          bubbleSpawnTimer = Math.random() * 4000 + 3500; // Nouvelle bulle toutes les 3.5 à 7.5 secondes
          
          const messages = [
            "MORDE LEEE, 3ADEH 3ADEH",
            "SOUS EZITHH",
            "VIVE EL MOB",
            "BIZARRE DEGUEULASSE",
            "LALA MAYENJEMCH , IMPOUSSI"
          ];
          const text = messages[Math.floor(Math.random() * messages.length)];
          const supporterIndex = Math.floor(Math.random() * crowdMembers.length);
          const supporter = crowdMembers[supporterIndex];
          
          // S'assurer que ce supporter n'a pas déjà une bulle active
          const alreadyHasBubble = activeBubbles.some(ab => ab.supporterIndex === supporterIndex);
          if (!alreadyHasBubble) {
            const bubble = createSpeechBubble(text, supporter, supporterIndex);
            speechBubbleContainer.addChild(bubble.container);
            activeBubbles.push(bubble);
          }
        }

        // --- GESTION DES COUPS ---
        let p1Hit = false;
        let p2Hit = false;

        if (gameMode === 'online') {
          if (onlineRole === 'host') {
            p1Hit = p1!.checkHit(p2!);
            if (p1Hit && socket) {
              const damage = p1!.equippedWeapon ? (p1!.equippedWeapon === 'knife' ? 2.2 : p1!.equippedWeapon === 'baseball_bat' ? 1.8 : 1.5) : (p1!.isHeavyPunch ? 1.0 : 0.4);
              const kbForce = p1!.equippedWeapon === 'baseball_bat' ? 24 : (p1!.isHeavyPunch ? 10 : 5);
              socket.emit('player_hit', {
                roomCode,
                damage,
                angle: p1!.rotation,
                isHeavy: p1!.isHeavyPunch || p1!.equippedWeapon !== null,
                kbForce
              });
            }
          } else {
            p2Hit = p2!.checkHit(p1!);
            if (p2Hit && socket) {
              const damage = p2!.equippedWeapon ? (p2!.equippedWeapon === 'knife' ? 2.2 : p2!.equippedWeapon === 'baseball_bat' ? 1.8 : 1.5) : (p2!.isHeavyPunch ? 1.0 : 0.4);
              const kbForce = p2!.equippedWeapon === 'baseball_bat' ? 24 : (p2!.isHeavyPunch ? 10 : 5);
              socket.emit('player_hit', {
                roomCode,
                damage,
                angle: p2!.rotation,
                isHeavy: p2!.isHeavyPunch || p2!.equippedWeapon !== null,
                kbForce
              });
            }
          }
        } else {
          p1Hit = p1!.checkHit(p2!);
          p2Hit = p2!.checkHit(p1!);
        }

        if (p1Hit) {
          state.cameraShake = p1!.state === 'punching' && p1!.hp > 0 ? 12 : 6;
          if (p1!.equippedWeapon) {
            soundManager.play('cheer', { volumeScale: 0.24, pitchVariation: 0.05 });
          }
          if (p2!.hp <= 0) {
            state.slowMoTimer = 2500;
            soundManager.play('final', { pan: (p2!.x - ringCenter.x) / ringCenter.x });
          }
        }
        if (p2Hit) {
          state.cameraShake = p2!.state === 'punching' && p2!.hp > 0 ? 12 : 6;
          if (p2!.equippedWeapon) {
            soundManager.play('cheer', { volumeScale: 0.24, pitchVariation: 0.05 });
          }
          if (p1!.hp <= 0) {
            state.slowMoTimer = 2500;
            soundManager.play('final', { pan: (p1!.x - ringCenter.x) / ringCenter.x });
          }
        }

        // --- ÉMISSION DES DONNÉES DU JOUEUR LOCAL (limité à ~30Hz pour éviter la congestion réseau) ---
        if (gameMode === 'online' && socket) {
          networkSendTimer += ticker.elapsedMS;
          if (networkSendTimer >= 33) {
            networkSendTimer = 0;
            const localFighter = onlineRole === 'host' ? p1 : p2;
            if (localFighter) {
              socket.emit('sync_fighter', {
                roomCode,
                fighterData: {
                  x: localFighter.x,
                  y: localFighter.y,
                  vx: localFighter.vx,
                  vy: localFighter.vy,
                  rotation: localFighter.rotation,
                  state: localFighter.state,
                  hp: localFighter.hp,
                  rage: localFighter.rage,
                  weapon: localFighter.equippedWeapon,
                  weaponUses: localFighter.weaponUses
                }
              });
            }
          }
        }

        // --- CAMERA SHAKE EFFECT ---
        if (state.cameraShake > 0.1) {
          worldContainer.x = (Math.random() - 0.5) * state.cameraShake;
          worldContainer.y = (Math.random() - 0.5) * state.cameraShake;
          state.cameraShake *= Math.pow(0.85, dt);
        } else {
          worldContainer.x = 0;
          worldContainer.y = 0;
        }

        // --- PARTICULES ---
        particles!.update(dt);

        // --- RETOUR DE DONNÉES À REACT ---
        onGameDataUpdate({
          p1Hp: p1!.hp,
          p2Hp: p2!.hp,
          p1Rage: p1!.rage,
          p2Rage: p2!.rage,
          p1Combo: p1!.punchCooldown > 0 ? 1 : 0,
          p2Combo: p2!.punchCooldown > 0 ? 1 : 0,
          gameTime: state.gameTime,
          isKO: p1!.hp <= 0 || p2!.hp <= 0,
        });

        // --- GESTION DU K.O. ---
        if ((p1!.hp <= 0 || p2!.hp <= 0) && state.slowMoTimer <= 0 && !state.gameOverTriggered) {
          if (gameMode === 'online') {
            if (onlineRole === 'host') {
              let winnerRole = 'tie';
              let winnerName = 'ÉGALITÉ !';
              if (p1!.hp <= 0 && p2!.hp > 0) {
                winnerRole = 'client';
                winnerName = player2Character.name;
              } else if (p2!.hp <= 0 && p1!.hp > 0) {
                winnerRole = 'host';
                winnerName = player1Character.name;
              }
              
              triggerGameOver(winnerName);
              if (socket) {
                socket.emit('game_over', { roomCode, winnerRole });
              }
            }
          } else {
            if (p1!.hp <= 0 && p2!.hp <= 0) {
              triggerGameOver('ÉGALITÉ !');
            } else if (p1!.hp <= 0) {
              triggerGameOver(p2!.config.name);
            } else {
              triggerGameOver(p1!.config.name);
            }
          }
        }
      });
      } catch (err: any) {
        console.error("Erreur d'initialisation de PixiJS:", err);
        setErrorMsg(err?.message || String(err));
      }
    }

    // --- SOUS-FONCTIONS PHYSIQUES & LOGIQUE ---

    // Met à jour le dessin des cordes du ring de façon réactive
    function updateRingAnimation(ropes: Graphics, p1: Fighter, p2: Fighter) {
      ropes.clear();

      const left = leftLimit;
      const right = rightLimit;
      const top = topLimit;
      const bottom = bottomLimit;

      // 1. Corde du haut (Top)
      let topCtrlY = top;
      [p1, p2].forEach(p => {
        if (p.x > left && p.x < right && Math.abs(p.y - top) < 35 && p.vy < 0) {
          topCtrlY = p.y - p.radius + 8;
        }
      });
      ropes.moveTo(left, top);
      ropes.quadraticCurveTo((left + right) / 2, topCtrlY, right, top);

      // 2. Corde du bas (Bottom)
      let bottomCtrlY = bottom;
      [p1, p2].forEach(p => {
        if (p.x > left && p.x < right && Math.abs(p.y - bottom) < 35 && p.vy > 0) {
          bottomCtrlY = p.y + p.radius - 8;
        }
      });
      ropes.moveTo(left, bottom);
      ropes.quadraticCurveTo((left + right) / 2, bottomCtrlY, right, bottom);

      // 3. Corde de gauche (Left)
      let leftCtrlX = left;
      [p1, p2].forEach(p => {
        if (p.y > top && p.y < bottom && Math.abs(p.x - left) < 35 && p.vx < 0) {
          leftCtrlX = p.x - p.radius + 8;
        }
      });
      ropes.moveTo(left, top);
      ropes.quadraticCurveTo(leftCtrlX, (top + bottom) / 2, left, bottom);

      // 4. Corde de droite (Right)
      let rightCtrlX = right;
      [p1, p2].forEach(p => {
        if (p.y > top && p.y < bottom && Math.abs(p.x - right) < 35 && p.vx > 0) {
          rightCtrlX = p.x + p.radius - 8;
        }
      });
      ropes.moveTo(right, top);
      ropes.quadraticCurveTo(rightCtrlX, (top + bottom) / 2, right, bottom);

      // Tracer des cordes néon rouges vibrantes avec un fil blanc
      ropes.stroke({ width: 4, color: 0xff3366, alpha: 0.75 });
      ropes.stroke({ width: 1.5, color: 0xffffff, alpha: 0.9 });
    }

    // Empêche les combattants de sortir du ring rectangulaire et simule le rebond
    function keepInRing(fighter: Fighter) {
      const leftLimitVal = leftLimit + fighter.radius;
      const rightLimitVal = rightLimit - fighter.radius;
      const topLimitVal = topLimit + fighter.radius;
      const bottomLimitVal = bottomLimit - fighter.radius;

      let hitCorde = false;
      let bounceX = false;
      let bounceY = false;

      if (fighter.x < leftLimitVal) {
        fighter.x = leftLimitVal;
        bounceX = true;
        hitCorde = true;
      } else if (fighter.x > rightLimitVal) {
        fighter.x = rightLimitVal;
        bounceX = true;
        hitCorde = true;
      }

      if (fighter.y < topLimitVal) {
        fighter.y = topLimitVal;
        bounceY = true;
        hitCorde = true;
      } else if (fighter.y > bottomLimitVal) {
        fighter.y = bottomLimitVal;
        bounceY = true;
        hitCorde = true;
      }

      if (hitCorde) {
        const bounceFactor = 0.55;
        if (bounceX) {
          fighter.vx = -fighter.vx * bounceFactor;
        }
        if (bounceY) {
          fighter.vy = -fighter.vy * bounceFactor;
        }

        soundManager.play('block', { pan: (fighter.x - ringCenter.x) / ringCenter.x, volumeScale: 0.4 });
        stateRef.current.cameraShake = Math.max(stateRef.current.cameraShake, 5);
      }
    }

    // Résout les collisions entre les deux combattants (les repousse s'ils se chevauchent)
    function resolveFighterCollisions(f1: Fighter, f2: Fighter) {
      if (f1.state === 'ko' || f2.state === 'ko') return;

      const dx = f2.x - f1.x;
      const dy = f2.y - f1.y;
      const dist = Math.hypot(dx, dy);
      const minDist = f1.radius + f2.radius - 2; // petit chevauchement acceptable

      if (dist < minDist) {
        const overlap = minDist - dist;
        const angle = dist > 0 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;

        // Force de répulsion physique
        const forceX = Math.cos(angle) * overlap * 0.5;
        const forceY = Math.sin(angle) * overlap * 0.5;

        // Repousser les coordonnées physiques
        f1.x -= forceX;
        f1.y -= forceY;
        f2.x += forceX;
        f2.y += forceY;

        // Échanger une partie des vitesses (transfert d'énergie cinétique)
        const tempVx = f1.vx;
        const tempVy = f1.vy;
        f1.vx = f1.vx * 0.7 + f2.vx * 0.3;
        f1.vy = f1.vy * 0.7 + f2.vy * 0.3;
        f2.vx = f2.vx * 0.7 + tempVx * 0.3;
        f2.vy = f2.vy * 0.7 + tempVy * 0.3;
      }
    }

    // Récupère l'état des entrées et l'applique aux combattants
    function handlePlayerInputs(p1: Fighter, p2: Fighter) {
      if (gameMode === 'online') {
        if (onlineRole === 'host') {
          // Hôte contrôle p1
          const p1In = inputManager.getPlayer1Controls();
          applyInputsToFighter(p1, p1In);
        } else {
          // Client contrôle p2 (avec les contrôles de P1 pour le confort !)
          const p2In = inputManager.getPlayer1Controls();
          applyInputsToFighter(p2, p2In);
        }
        return;
      }

      // Mode Local (Solo / Versus)
      const p1In = inputManager.getPlayer1Controls();
      applyInputsToFighter(p1, p1In);

      if (gameMode === 'versus') {
        const p2In = inputManager.getPlayer2Controls();
        applyInputsToFighter(p2, p2In);
      }
    }

    function applyInputsToFighter(fighter: Fighter, inputs: any) {
      let dx = 0;
      let dy = 0;
      if (inputs.up) dy = -1;
      if (inputs.down) dy = 1;
      if (inputs.left) dx = -1;
      if (inputs.right) dx = 1;

      fighter.move(dx, dy);

      if (inputs.punch) {
        fighter.punch();
      }
      if (inputs.block) {
        fighter.startBlock();
      }
      if (inputs.dash && (dx !== 0 || dy !== 0)) {
        fighter.dash(dx, dy);
      }

      if (inputs.punch && inputs.block && fighter.rage >= fighter.maxRage) {
        if (fighter.useSuper()) {
          soundManager.play('cheer', { volumeScale: 0.28, pitchVariation: 0.1 });
        }
      }
    }

    // IA du second combattant
    let aiUpdateTimer = 0;
    let aiCurrentAction: 'chase' | 'flee' | 'block' | 'idle' = 'chase';
    
    function handleAI(ai: Fighter, target: Fighter, diff: 'easy' | 'normal' | 'hard', dt: number) {
      if (ai.state === 'ko' || ai.state === 'stunned') return;

      aiUpdateTimer += dt;
      // L'IA prend des décisions périodiquement selon son niveau de difficulté (plus rapide en hard)
      const decisionInterval = diff === 'easy' ? 40 : diff === 'normal' ? 25 : 12;

      if (aiUpdateTimer >= decisionInterval) {
        aiUpdateTimer = 0;

        const dx = target.x - ai.x;
        const dy = target.y - ai.y;
        const dist = Math.hypot(dx, dy);

        // 1. Définir le comportement
        if (dist > 180) {
          // Loin : poursuivre le joueur
          aiCurrentAction = 'chase';
        } else if (dist < 85) {
          // À portée de coup ou trop près : attaquer, reculer ou parer
          const rand = Math.random();
          if (rand < 0.6) {
            ai.punch();
          } else if (rand < 0.8) {
            aiCurrentAction = 'flee';
          } else {
            ai.startBlock();
          }
        } else {
          // Distance de combat moyenne : alterner
          const rand = Math.random();
          if (rand < 0.45) {
            aiCurrentAction = 'chase';
          } else if (rand < 0.7) {
            ai.startBlock();
          } else if (rand < 0.9 && ai.dashCooldown <= 0) {
            // Faire un dash d'attaque
            ai.dash(dx, dy);
          } else {
            aiCurrentAction = 'idle';
          }
        }

        // Action de réaction immédiate (si le joueur attaque et que l'IA est réactive)
        const reactionChance = diff === 'easy' ? 0.05 : diff === 'normal' ? 0.22 : 0.65;
        if (target.state === 'punching' && dist < 80 && Math.random() < reactionChance) {
          if (Math.random() < 0.6) {
            ai.startBlock(); // Parer au bon moment !
          } else if (ai.dashCooldown <= 0) {
            // Dasher latéralement pour esquiver
            const angleSide = ai.rotation + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
            ai.dash(Math.cos(angleSide), Math.sin(angleSide));
          }
        }

        // Lancer le Super si disponible
        if (ai.rage >= ai.maxRage && dist < 120 && Math.random() < 0.8) {
          if (ai.useSuper()) {
            soundManager.play('cheer', { volumeScale: 0.28, pitchVariation: 0.1 });
          }
        }
      }

      // 2. Exécuter l'action en cours
      const dx = target.x - ai.x;
      const dy = target.y - ai.y;
      
      if (aiCurrentAction === 'chase') {
        ai.move(dx, dy);
      } else if (aiCurrentAction === 'flee') {
        ai.move(-dx, -dy);
      }
    }

    function drawDroppedItemShadow(g: Graphics) {
      g.ellipse(0, 0, 16, 7);
      g.fill({ color: 0x000000, alpha: 0.25 });
    }

    function drawDroppedItem(g: Graphics, type: 'baseball_bat' | 'knife' | 'bottle') {
      g.clear();
      if (type === 'baseball_bat') {
        // Corps en bois
        g.rect(-12, -2.5, 24, 5);
        g.fill({ color: 0xd2b48c });
        g.stroke({ width: 1.2, color: 0x5c4033 });
        // Grip noir
        g.rect(-12, -2, 6, 4);
        g.fill({ color: 0x111111 });
      } else if (type === 'knife') {
        // Manche marron
        g.rect(-8, -1.5, 6, 3);
        g.fill({ color: 0x8b4513 });
        // Garde
        g.rect(-2, -3.5, 1.5, 7);
        g.fill({ color: 0x222222 });
        // Lame argentée
        g.rect(-0.5, -2, 11, 4);
        g.fill({ color: 0xdddddd });
        g.stroke({ width: 0.8, color: 0x777777 });
      } else if (type === 'bottle') {
        // Bouteille verte
        g.rect(-6, -3.5, 12, 7);
        g.fill({ color: 0x2e8b57, alpha: 0.85 });
        g.stroke({ width: 1, color: 0x1e4d2b });
        // Goulot
        g.rect(6, -1.5, 4, 3);
        g.fill({ color: 0x2e8b57, alpha: 0.85 });
      }
    }

    function createCrowdMember(parent: Container, x: number, y: number, color: number): CrowdMember {
      const g = new Graphics();
      g.x = x;
      g.y = y;
      parent.addChild(g);

      // 1. Dessiner l'ombre au sol
      g.ellipse(0, 3, 11, 5);
      g.fill({ color: 0x000000, alpha: 0.25 });

      // 2. Dessiner le corps circulaire
      g.circle(0, -6, 12);
      g.fill({ color });
      g.stroke({ width: 1.5, color: 0x111111 });

      // 3. Calculer l'orientation du regard
      let eyeOffset = 0;
      if (x < leftLimit) {
        eyeOffset = 2.2; // regarde vers la droite
      } else if (x > rightLimit) {
        eyeOffset = -2.2; // regarde vers la gauche
      }

      // 4. Dessiner les yeux blancs décalés
      g.circle(-4 + eyeOffset, -10, 3.5);
      g.fill({ color: 0xffffff });
      g.stroke({ width: 1, color: 0x111111 });

      g.circle(4 + eyeOffset, -10, 3.5);
      g.fill({ color: 0xffffff });
      g.stroke({ width: 1, color: 0x111111 });

      // 5. Dessiner les pupilles noires
      g.circle(-4 + eyeOffset * 1.3, -9, 1.2);
      g.fill({ color: 0x111111 });

      g.circle(4 + eyeOffset * 1.3, -9, 1.2);
      g.fill({ color: 0x111111 });

      // 6. Petit bandeau de supporter (50% de chance)
      if (Math.random() < 0.5) {
        g.rect(-11, -15, 22, 3);
        g.fill({ color: 0xff3366 });
      }

      // 7. Drapeau d'Algérie tenu par le supporter (20% de chance)
      let flagContainer: Container | undefined = undefined;
      if (Math.random() < 0.20) {
        flagContainer = new Container();
        g.addChild(flagContainer);

        // Hampe du drapeau (bâton)
        const pole = new Graphics();
        pole.rect(-1, -22, 2, 22);
        pole.fill({ color: 0x8b4513 });
        flagContainer.addChild(pole);

        // Drapeau lui-même (dessin vectoriel d'Algérie)
        const flag = new Graphics();
        // Côté gauche : Vert
        flag.rect(0, -22, 9, 12);
        flag.fill({ color: 0x006633 });
        // Côté droit : Blanc
        flag.rect(9, -22, 9, 12);
        flag.fill({ color: 0xffffff });
        
        // Croissant rouge au milieu (disque rouge masqué par un disque blanc un peu décalé)
        flag.circle(9, -16, 3);
        flag.fill({ color: 0xd21034 });
        flag.circle(10.2, -16, 2.4);
        flag.fill({ color: 0xffffff }); // Le fond blanc masque le rouge pour créer le croissant
        
        // Étoile rouge à 5 branches simplifiée
        flag.moveTo(11, -17.5);
        flag.lineTo(11.5, -16.2);
        flag.lineTo(12.8, -16.2);
        flag.lineTo(11.8, -15.4);
        flag.lineTo(12.2, -14.1);
        flag.lineTo(11, -14.9);
        flag.lineTo(9.8, -14.1);
        flag.lineTo(10.2, -15.4);
        flag.lineTo(9.2, -16.2);
        flag.lineTo(10.5, -16.2);
        flag.closePath();
        flag.fill({ color: 0xd21034 });

        // Bordure fine
        flag.rect(0, -22, 18, 12);
        flag.stroke({ width: 0.5, color: 0x222222 });

        flagContainer.addChild(flag);
      }

      return {
        container: g as any, // Graphics hérite de Container en PixiJS
        x,
        y,
        color,
        phase: Math.random() * Math.PI * 2,
        body: g,
        eyeL: g,
        eyeR: g,
        flagContainer,
      };
    }

    function spawnItem(
      type: 'baseball_bat' | 'knife' | 'bottle',
      startX: number,
      startY: number,
      targetX: number,
      targetY: number,
      launcherIndex: number
    ) {
      if (launcherIndex >= 0 && crowdMembers[launcherIndex]) {
        crowdMembers[launcherIndex].phase = Math.random() * Math.PI;
      }

      const shadow = new Graphics();
      drawDroppedItemShadow(shadow);
      shadow.x = startX;
      shadow.y = startY;
      if (itemContainer) itemContainer.addChild(shadow);

      const graphic = new Graphics();
      drawDroppedItem(graphic, type);
      graphic.x = startX;
      graphic.y = startY;
      if (itemContainer) itemContainer.addChild(graphic);

      const duration = 50;
      const vx = (targetX - startX) / duration;
      const vy = (targetY - startY) / duration;

      soundManager.play('cheer', { volumeScale: 0.22, pitchVariation: 0.1 });

      droppedItems.push({
        type,
        x: startX,
        y: startY,
        targetX,
        targetY,
        z: 0,
        vz: 13,
        vx,
        vy,
        isAirborne: true,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        shadow,
        graphic,
      });
    }

    function createSpeechBubble(text: string, supporter: CrowdMember, supporterIndex: number) {
      const textObj = new Text({
        text,
        style: {
          fontFamily: 'Outfit',
          fontSize: 12,
          fontWeight: '900',
          fill: 0x111111,
          align: 'center',
          wordWrap: true,
          wordWrapWidth: 130,
        }
      });
      textObj.anchor.set(0.5);

      const paddingX = 8;
      const paddingY = 6;
      const textWidth = textObj.width;
      const textHeight = textObj.height;
      const bubbleWidth = Math.max(65, textWidth + paddingX * 2);
      const bubbleHeight = textHeight + paddingY * 2;

      const bg = new Graphics();
      const isTopSupporter = supporter.y < ringCenter.y;
      
      if (isTopSupporter) {
        // Dessiner le fond (remplissage blanc) orienté vers le bas
        bg.roundRect(-bubbleWidth / 2, 6, bubbleWidth, bubbleHeight, 6);
        bg.moveTo(-5, 6);
        bg.lineTo(5, 6);
        bg.lineTo(0, 1);
        bg.closePath();
        bg.fill({ color: 0xffffff });

        // Dessiner le contour noir (stroke)
        bg.roundRect(-bubbleWidth / 2, 6, bubbleWidth, bubbleHeight, 6);
        bg.moveTo(-5, 6);
        bg.lineTo(0, 1);
        bg.lineTo(5, 6);
        bg.stroke({ width: 1.5, color: 0x111111 });

        textObj.x = 0;
        textObj.y = bubbleHeight / 2 + 6;
      } else {
        // Dessiner le fond (remplissage blanc) orienté vers le haut
        bg.roundRect(-bubbleWidth / 2, -bubbleHeight - 6, bubbleWidth, bubbleHeight, 6);
        bg.moveTo(-5, -6);
        bg.lineTo(5, -6);
        bg.lineTo(0, -1);
        bg.closePath();
        bg.fill({ color: 0xffffff });

        // Dessiner le contour noir (stroke)
        bg.roundRect(-bubbleWidth / 2, -bubbleHeight - 6, bubbleWidth, bubbleHeight, 6);
        bg.moveTo(-5, -6);
        bg.lineTo(0, -1);
        bg.lineTo(5, -6);
        bg.stroke({ width: 1.5, color: 0x111111 });

        textObj.x = 0;
        textObj.y = -bubbleHeight / 2 - 6;
      }

      const bubbleContainer = new Container();
      bubbleContainer.addChild(bg);
      bubbleContainer.addChild(textObj);
      bubbleContainer.x = supporter.x;
      bubbleContainer.y = isTopSupporter ? supporter.y + 12 : supporter.y - 12;
      bubbleContainer.scale.set(0);

      return {
        container: bubbleContainer,
        timer: 2500, // affichage pendant 2.5 secondes
        maxTime: 2500,
        supporterIndex,
      };
    }

    function updateDroppedItems(dt: number, itemsList: DroppedItem[], f1: Fighter, f2: Fighter) {
      const gravity = 0.45;

      for (let i = itemsList.length - 1; i >= 0; i--) {
        const item = itemsList[i];

        if (item.isAirborne) {
          item.x += item.vx * dt;
          item.y += item.vy * dt;

          item.z += item.vz * dt;
          item.vz -= gravity * dt;

          item.graphic.rotation += item.rotationSpeed * dt;

          item.shadow.x = item.x;
          item.shadow.y = item.y;
          
          item.graphic.x = item.x;
          item.graphic.y = item.y - item.z;

          if (item.z <= 0 && item.vz < 0) {
            item.isAirborne = false;
            item.z = 0;
            item.graphic.y = item.y;
            item.graphic.rotation = Math.random() * Math.PI * 2;

            let soundName = 'block';
            let vol = 0.5;
            if (item.type === 'bottle') {
              soundName = 'block';
              vol = 0.3;
            } else if (item.type === 'baseball_bat') {
              soundName = 'hit';
              vol = 0.45;
            }
            soundManager.play(soundName, { pan: (item.x - ringCenter.x) / ringCenter.x, pitchVariation: 0.3, volumeScale: vol });
          }
        } else {
          if (gameMode === 'online') {
            const localFighter = onlineRole === 'host' ? f1 : f2;
            if (localFighter && localFighter.state !== 'ko') {
              const dist = Math.hypot(localFighter.x - item.x, localFighter.y - item.y);
              if (dist < localFighter.radius + 10) {
                localFighter.equipWeapon(item.type);
                soundManager.play('block', { pan: (localFighter.x - ringCenter.x) / ringCenter.x, pitchVariation: 0.1, volumeScale: 1.0 });

                particles?.emitBlockSparks(item.x, item.y);

                if (socket) {
                  socket.emit('item_picked', {
                    roomCode,
                    itemIndex: i,
                    pickerRole: onlineRole,
                    itemType: item.type
                  });
                }

                try {
                  if (!item.shadow.destroyed) item.shadow.destroy();
                  if (!item.graphic.destroyed) item.graphic.destroy();
                } catch (e) {}

                itemsList.splice(i, 1);
              }
            }
          } else {
            for (const fighter of [f1, f2]) {
              if (fighter.state === 'ko') continue;

              const dist = Math.hypot(fighter.x - item.x, fighter.y - item.y);
              if (dist < fighter.radius + 10) {
                fighter.equipWeapon(item.type);
                soundManager.play('block', { pan: (fighter.x - ringCenter.x) / ringCenter.x, pitchVariation: 0.1, volumeScale: 1.0 });

                particles?.emitBlockSparks(item.x, item.y);

                try {
                  if (!item.shadow.destroyed) item.shadow.destroy();
                  if (!item.graphic.destroyed) item.graphic.destroy();
                } catch (e) {}

                itemsList.splice(i, 1);
                break; // Un seul combattant peut ramasser l'objet
              }
            }
          }
        }
      }
    }

    function triggerGameOver(winner: string) {
      if (stateRef.current.gameOverTriggered) return;
      stateRef.current.gameOverTriggered = true;
      soundManager.stopBGM();
      soundManager.play('cheer');
      onGameOver(winner);
    }

    // Lancer l'initialisation de PixiJS
    initPixi();

    // Nettoyage lors du démontage du composant
    return () => {
      active = false;
      soundManager.stopBGM();
      
      // Décharger la texture pour éviter les conflits de cache WebGL
      try {
        Assets.unload('/assets/images/ring_background.png');
      } catch (e) {}
      
      // Nettoyer manuellement les graphiques des armes au sol
      droppedItems.forEach(item => {
        try {
          if (!item.shadow.destroyed) item.shadow.destroy();
          if (!item.graphic.destroyed) item.graphic.destroy();
        } catch (e) {}
      });
      droppedItems.length = 0;
      crowdMembers.length = 0;

      // Nettoyer les bulles actives
      activeBubbles.forEach(ab => {
        try {
          if (!ab.container.destroyed) ab.container.destroy({ children: true });
        } catch (e) {}
      });
      activeBubbles.length = 0;

      if (app) {
        try {
          // PixiJS v8 lève une erreur si détruit avant d'être totalement initialisé (sans renderer)
          if (app.renderer) {
            app.destroy(true, { children: true });
          }
        } catch (e) {
          console.warn("Erreur lors de la destruction de l'application PixiJS:", e);
        }
      }
      if (particles) {
        particles.destroy();
      }

      // Désenregistrer les écouteurs de socket pour éviter les conflits de closures obsolètes
      if (socket) {
        socket.off('opponent_fighter_sync');
        socket.off('opponent_hit');
        socket.off('item_spawned');
        socket.off('opponent_item_picked');
        socket.off('game_time_sync');
        socket.off('match_over');
        socket.off('opponent_left');
      }
    };
  }, [gameMode, difficulty, player1Character, player2Character, socket, onlineRole, roomCode]);

  if (errorMsg) {
    return (
      <div 
        className="relative rounded-2xl border bg-slate-950 flex flex-col justify-center items-center text-center p-6 gap-4 border-red-500-20 w-full h-full"
      >
        <h3 className="text-xl font-black uppercase text-red-400">Erreur d'initialisation</h3>
        <p className="text-xs font-mono bg-black-40 p-4 rounded-xl border border-white-5 max-w-xl overflow-auto text-zinc-400">
          {errorMsg}
        </p>
        <button onClick={() => window.location.reload()} className="py-2-5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs uppercase transition-all">
          Recharger la page
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden bg-slate-950 flex justify-center items-center border border-pink-500-20 z-10 w-full h-full"
      style={{
        touchAction: 'none',
        boxShadow: '0 0 50px rgba(255,51,102,0.15)',
        zIndex: 1
      }}
    />
  );
};
