/**
 * Fighter.ts
 * Représente un combattant dans l'arène.
 * Gère la physique (mouvement, friction, collisions), les états de combat,
 * et l'animation procédurale (yeux dynamiques, gants animés, squash & stretch).
 */

import { Container, Graphics } from 'pixi.js';
import { soundManager } from './SoundManager';
import { ParticleSystem } from './ParticleSystem';

export type FighterState = 'idle' | 'moving' | 'punching' | 'dashing' | 'blocking' | 'stunned' | 'ko';

export interface FighterConfig {
  name: string;
  x: number;
  y: number;
  color: number;
  gloveColor: number;
  speed: number;
  power: number;
  defense: number;
  maxHp: number;
  isPlayer: boolean;
  keyboardLayout: 'player1' | 'player2' | 'ai';
}

export class Fighter {
  public container: Container;
  public config: FighterConfig;

  // Variables physiques
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public radius: number = 28;
  public rotation: number = 0; // en radians

  // Statistiques de jeu
  public hp: number;
  public maxHp: number;
  public rage: number = 0;
  public maxRage: number = 100;
  public wins: number = 0;

  // Machine à états
  public state: FighterState = 'idle';
  private stateTimer: number = 0;

  // Variables d'attaque & parade
  public punchCooldown: number = 0;
  public blockCooldown: number = 0;
  public dashCooldown: number = 0;
  public hitStunTimer: number = 0;
  public stunStarsTimer: number = 0;
  private isLeftPunch: boolean = true;
  private punchCombo: number = 0;
  private comboResetTimer: number = 0;
  public isHeavyPunch: boolean = false;

  // Objets graphiques internes (pour l'animation)
  private shadow: Graphics;
  private body: Graphics;
  private headContainer: Container;
  private eyeL: Graphics;
  private eyeR: Graphics;
  private pupilL: Graphics;
  private pupilR: Graphics;
  private handL: Graphics;
  private handR: Graphics;
  private stunStarsContainer: Container;

  // Cibles d'animation (pour interpolation fluide / Lerp)
  private animScaleX: number = 1.0;
  private animScaleY: number = 1.0;
  private curScaleX: number = 1.0;
  private curScaleY: number = 1.0;

  private curHandLX: number = -24;
  private curHandLY: number = -12;
  private curHandRX: number = 24;
  private curHandRY: number = -12;

  // Variables d'armes
  public equippedWeapon: 'baseball_bat' | 'knife' | 'bottle' | null = null;
  public weaponUses: number = 0;
  public weaponGraphic: Graphics;

  // Référence système de particules
  private particles: ParticleSystem | null = null;

  constructor(config: FighterConfig, gameContainer: Container) {
    this.config = config;
    this.x = config.x;
    this.y = config.y;
    this.maxHp = config.maxHp;
    this.hp = config.maxHp;

    // Créer les conteneurs PixiJS
    this.container = new Container();
    this.container.x = this.x;
    this.container.y = this.y;
    gameContainer.addChild(this.container);

    this.headContainer = new Container();
    this.container.addChild(this.headContainer);

    this.stunStarsContainer = new Container();
    this.container.addChild(this.stunStarsContainer);

    // Initialiser les éléments graphiques
    this.shadow = new Graphics();
    this.body = new Graphics();
    this.eyeL = new Graphics();
    this.eyeR = new Graphics();
    this.pupilL = new Graphics();
    this.pupilR = new Graphics();
    this.handL = new Graphics();
    this.handR = new Graphics();
    this.weaponGraphic = new Graphics();
    this.container.addChild(this.weaponGraphic); // Ajouter l'arme au conteneur principal

    this.drawFighter();
  }

  public setParticleSystem(particles: ParticleSystem) {
    this.particles = particles;
  }

  /**
   * Construit la géométrie et l'arborescence graphique du combattant
   */
  private drawFighter() {
    // 1. Ombre au sol
    this.shadow.ellipse(0, 5, 26, 12);
    this.shadow.fill({ color: 0x000000, alpha: 0.25 });
    this.container.addChildAt(this.shadow, 0); // Toujours derrière

    // 2. Corps circulaire
    this.body.circle(0, 0, this.radius);
    this.body.fill({ color: this.config.color });
    this.body.stroke({ width: 3, color: 0x111111 });
    this.headContainer.addChild(this.body);

    // 3. Yeux expressifs
    const eyeSize = 7;
    // Oeil gauche
    this.eyeL.circle(0, 0, eyeSize);
    this.eyeL.fill({ color: 0xffffff });
    this.eyeL.stroke({ width: 1.5, color: 0x111111 });
    this.eyeL.x = -10;
    this.eyeL.y = -8;
    this.headContainer.addChild(this.eyeL);

    // Oeil droit
    this.eyeR.circle(0, 0, eyeSize);
    this.eyeR.fill({ color: 0xffffff });
    this.eyeR.stroke({ width: 1.5, color: 0x111111 });
    this.eyeR.x = 10;
    this.eyeR.y = -8;
    this.headContainer.addChild(this.eyeR);

    // Pupilles
    const pupilSize = 3;
    this.pupilL.circle(0, 0, pupilSize);
    this.pupilL.fill({ color: 0x111111 });
    this.pupilL.x = -10;
    this.pupilL.y = -8;
    this.headContainer.addChild(this.pupilL);

    this.pupilR.circle(0, 0, pupilSize);
    this.pupilR.fill({ color: 0x111111 });
    this.pupilR.x = 10;
    this.pupilR.y = -8;
    this.headContainer.addChild(this.pupilR);

    // 4. Gants de boxe (mains)
    const gloveSize = 10;
    this.handL.circle(0, 0, gloveSize);
    this.handL.fill({ color: this.config.gloveColor });
    this.handL.stroke({ width: 2, color: 0x111111 });
    this.container.addChild(this.handL);

    this.handR.circle(0, 0, gloveSize);
    this.handR.fill({ color: this.config.gloveColor });
    this.handR.stroke({ width: 2, color: 0x111111 });
    this.container.addChild(this.handR);

    this.drawStunStars();
  }

  /**
   * Initialise les étoiles d'étourdissement graphiques
   */
  private drawStunStars() {
    const starCount = 3;
    const color = 0xffd700; // Couleur Or
    for (let i = 0; i < starCount; i++) {
      const star = new Graphics();
      // Dessiner une forme d'étoile simple à 4 branches
      star.moveTo(0, -5);
      star.lineTo(1.5, -1.5);
      star.lineTo(5, 0);
      star.lineTo(1.5, 1.5);
      star.lineTo(0, 5);
      star.lineTo(-1.5, 1.5);
      star.lineTo(-5, 0);
      star.lineTo(-1.5, -1.5);
      star.closePath();
      star.fill({ color });
      this.stunStarsContainer.addChild(star);
    }
    this.stunStarsContainer.visible = false;
  }

  /**
   * Met à jour la physique, la machine à états et les animations procédurales
   */
  public update(dt: number, opponentX: number, opponentY: number) {
    // Diminuer les cooldowns
    if (this.punchCooldown > 0) this.punchCooldown -= dt;
    if (this.blockCooldown > 0) this.blockCooldown -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.hitStunTimer > 0) this.hitStunTimer -= dt;
    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) {
        this.punchCombo = 0;
      }
    }

    // Gérer l'état d'étourdissement visuel (étoiles)
    if (this.state === 'stunned') {
      this.stunStarsContainer.visible = true;
      const time = Date.now() * 0.008;
      this.stunStarsContainer.children.forEach((star, index) => {
        const angle = time + (index * Math.PI * 2) / 3;
        star.x = Math.cos(angle) * 18;
        star.y = -36 + Math.sin(angle) * 5;
        const scale = 0.7 + Math.sin(angle) * 0.3;
        star.scale.set(scale);
      });

      this.stunStarsTimer += dt;
      if (this.stunStarsTimer >= 6) {
        this.stunStarsTimer = 0;
        this.particles?.emitStunStars(this.x, this.y);
      }
    } else {
      this.stunStarsContainer.visible = false;
    }

    // Mettre à jour le timer d'état actuel
    if (this.stateTimer > 0) {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        if (this.state === 'dashing' || this.state === 'punching' || this.state === 'blocking' || this.state === 'stunned') {
          this.state = 'idle';
        }
      }
    }

    // Orienter le combattant vers son adversaire s'il n'est pas K.O.
    if (this.state !== 'ko') {
      const dx = opponentX - this.x;
      const dy = opponentY - this.y;
      this.rotation = Math.atan2(dy, dx);
    }

    // Appliquer la friction physique
    const friction = this.state === 'dashing' ? 0.95 : 0.82;
    this.vx *= Math.pow(friction, dt);
    this.vy *= Math.pow(friction, dt);

    // Mettre à jour la position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.container.x = this.x;
    this.container.y = this.y;

    // Orienter le conteneur de la tête
    this.headContainer.rotation = this.rotation;

    // Animer les yeux (les pupilles regardent l'adversaire de façon plus prononcée)
    this.animateEyes(opponentX, opponentY);

    // Animer les gants et appliquer Squash & Stretch
    this.animateProcedural(dt);
  }

  /**
   * Oriente les pupilles dynamiquement vers l'adversaire et gère les expressions faciales
   */
  private animateEyes(opponentX: number, opponentY: number) {
    const dx = opponentX - this.x;
    const dy = opponentY - this.y;
    const dist = Math.hypot(dx, dy);

    // Expression faciale selon l'état du combattant
    if (this.state === 'ko') {
      // Yeux fermés de K.O.
      this.eyeL.scale.y = 0.15;
      this.eyeR.scale.y = 0.15;
      this.pupilL.visible = false;
      this.pupilR.visible = false;
    } else if (this.hitStunTimer > 0 || this.state === 'stunned') {
      // Yeux fermés de douleur à l'impact
      this.eyeL.scale.y = 0.15;
      this.eyeR.scale.y = 0.15;
      this.pupilL.visible = false;
      this.pupilR.visible = false;
    } else if (this.state === 'blocking') {
      // Yeux plissés de concentration
      this.eyeL.scale.y = 0.55;
      this.eyeR.scale.y = 0.55;
      this.pupilL.visible = true;
      this.pupilR.visible = true;
      
      // Centrer les pupilles
      this.pupilL.x = -10;
      this.pupilL.y = -8;
      this.pupilR.x = 10;
      this.pupilR.y = -8;
    } else {
      // Yeux grands ouverts normaux
      this.eyeL.scale.y = 1.0;
      this.eyeR.scale.y = 1.0;
      this.pupilL.visible = true;
      this.pupilR.visible = true;

      if (dist > 0) {
        // Déplacement maximal des pupilles = 2.5 pixels
        const lookX = (dx / dist) * 2.5;
        const lookY = (dy / dist) * 2.5;

        // Positionner les pupilles par rapport au centre de l'oeil
        this.pupilL.x = -10 + lookX;
        this.pupilL.y = -8 + lookY;
        this.pupilR.x = 10 + lookX;
        this.pupilR.y = -8 + lookY;
      } else {
        this.pupilL.x = -10;
        this.pupilL.y = -8;
        this.pupilR.x = 10;
        this.pupilR.y = -8;
      }
    }
  }

  /**
   * Gère les déformations visuelles et les mouvements procéduraux des gants
   */
  private animateProcedural(dt: number) {
    const speedMagnitude = Math.hypot(this.vx, this.vy);

    // 1. Définir les cibles de Squash & Stretch selon l'état
    if (this.state === 'dashing') {
      // S'étire dans le sens du mouvement rapide
      this.animScaleX = 1.35;
      this.animScaleY = 0.75;
    } else if (this.state === 'stunned') {
      // Oscille de gauche à droite
      this.animScaleX = 1.0 + Math.sin(Date.now() * 0.02) * 0.15;
      this.animScaleY = 1.0 - Math.sin(Date.now() * 0.02) * 0.15;
    } else if (this.hitStunTimer > 0) {
      // Secoué après un coup
      this.animScaleX = 0.8;
      this.animScaleY = 1.2;
    } else if (speedMagnitude > 0.5) {
      // Respire/Sautille en marchant
      const walkCycle = Math.sin(Date.now() * 0.015);
      this.animScaleX = 1.0 + walkCycle * 0.08;
      this.animScaleY = 1.0 - walkCycle * 0.08;
    } else {
      // Respiration au repos (Idle)
      const idleCycle = Math.sin(Date.now() * 0.003);
      this.animScaleX = 1.0 + idleCycle * 0.03;
      this.animScaleY = 1.0 - idleCycle * 0.03;
    }

    // Appliquer le LERP sur le scale de la tête
    this.curScaleX += (this.animScaleX - this.curScaleX) * 0.25 * dt;
    this.curScaleY += (this.animScaleY - this.curScaleY) * 0.25 * dt;
    this.headContainer.scale.set(this.curScaleX, this.curScaleY);

    // 2. Animer les positions des mains (gants)
    let targetLX = -24;
    let targetLY = -12;
    let targetRX = 24;
    let targetRY = -12;

    if (this.state === 'punching') {
      // Projection du poing vers l'avant !
      const punchProgress = this.stateTimer / (this.isHeavyPunch ? 16 : 10); // 0 à 1
      const punchDist = this.isHeavyPunch ? 65 : 45;

      // Interpolation sinusoïdale pour l'aller-retour du poing
      const punchOffset = Math.sin(punchProgress * Math.PI) * punchDist;

      if (this.isLeftPunch) {
        targetLX = -12 + punchOffset;
        targetLY = -30;
      } else {
        targetRX = 12 + punchOffset;
        targetRY = -30;
      }
    } else if (this.state === 'blocking') {
      // Rapprocher les deux gants devant le visage pour former un bouclier
      targetLX = -10;
      targetLY = -22;
      targetRX = 10;
      targetRY = -22;
    } else if (this.state === 'stunned' || this.state === 'ko') {
      // Les mains tombent sur le côté, flasques
      targetLX = -20;
      targetLY = 15;
      targetRX = 20;
      targetRY = 15;
    } else if (speedMagnitude > 0.5) {
      // Balancement des bras en marchant
      const swing = Math.sin(Date.now() * 0.015) * 8;
      targetLX = -24;
      targetLY = -12 + swing;
      targetRX = 24;
      targetRY = -12 - swing;
    }

    // Appliquer le LERP pour la position des mains
    this.curHandLX += (targetLX - this.curHandLX) * 0.3 * dt;
    this.curHandLY += (targetLY - this.curHandLY) * 0.3 * dt;
    this.curHandRX += (targetRX - this.curHandRX) * 0.3 * dt;
    this.curHandRY += (targetRY - this.curHandRY) * 0.3 * dt;

    // Orienter les mains avec la rotation de la tête
    // (Puisqu'elles sont en dehors du headContainer pour ne pas subir les déformations de scale directes,
    // on doit faire pivoter leurs coordonnées locales autour du centre)
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);

    this.handL.x = this.curHandLX * cos - this.curHandLY * sin;
    this.handL.y = this.curHandLX * sin + this.curHandLY * cos;

    this.handR.x = this.curHandRX * cos - this.curHandRY * sin;
    this.handR.y = this.curHandRX * sin + this.curHandRY * cos;

    // Mettre à jour l'affichage de l'arme
    if (this.equippedWeapon) {
      this.weaponGraphic.visible = true;
      // L'arme suit la main active de frappe (ou la main droite par défaut)
      if (this.state === 'punching') {
        if (this.isLeftPunch) {
          this.weaponGraphic.x = this.handL.x;
          this.weaponGraphic.y = this.handL.y;
        } else {
          this.weaponGraphic.x = this.handR.x;
          this.weaponGraphic.y = this.handR.y;
        }
      } else {
        // Main droite par défaut
        this.weaponGraphic.x = this.handR.x;
        this.weaponGraphic.y = this.handR.y;
      }
      this.weaponGraphic.rotation = this.rotation + Math.PI / 2; // pointée en avant
    } else {
      this.weaponGraphic.visible = false;
    }
  }

  /**
   * Action : Se déplacer
   */
  public move(dx: number, dy: number) {
    if (this.state === 'ko' || this.state === 'stunned' || this.state === 'dashing' || this.hitStunTimer > 0) return;

    // Normaliser le vecteur de déplacement
    const magnitude = Math.hypot(dx, dy);
    if (magnitude > 0) {
      const finalSpeed = this.config.speed * (this.state === 'blocking' ? 0.4 : 1.0);
      this.vx += (dx / magnitude) * finalSpeed * 0.11;
      this.vy += (dy / magnitude) * finalSpeed * 0.11;

      // Conserver l'état de frappe (punching) ou de parade (blocking) s'il est actif
      if (this.state !== 'punching' && this.state !== 'blocking') {
        this.state = 'moving';
      }
    }
  }

  /**
   * Action : Donner un coup de poing
   */
  public punch(): boolean {
    if (this.state === 'ko' || this.state === 'stunned' || this.state === 'dashing' || this.punchCooldown > 0) return false;

    this.state = 'punching';
    this.isLeftPunch = !this.isLeftPunch;

    // Combo : si on enchaîne rapidement, le 3e coup est une attaque lourde
    this.punchCombo++;
    this.comboResetTimer = 22; // temps pour continuer le combo

    if (this.punchCombo >= 3) {
      this.isHeavyPunch = true;
      this.stateTimer = 16; // animation plus longue
      this.punchCooldown = 25; // cooldown plus long
      this.punchCombo = 0; // reset combo

      // Jouer son lourd
      const pan = (this.x - 400) / 400; // pan relatif selon X
      soundManager.play('punch_heavy', { pan, pitchVariation: 0.1 });
    } else {
      this.isHeavyPunch = false;
      this.stateTimer = 10; // animation rapide
      this.punchCooldown = 12; // cooldown court

      // Jouer son normal
      const pan = (this.x - 400) / 400;
      soundManager.play('punch', { pan, pitchVariation: 0.15 });
    }

    return true;
  }

  /**
   * Action : Effectuer une esquive rapide (Dash)
   */
  public dash(dx: number, dy: number): boolean {
    if (this.state === 'ko' || this.state === 'stunned' || this.dashCooldown > 0) return false;

    // Si aucune direction n'est fournie, dash dans la direction de regard
    let angle = this.rotation;
    if (dx !== 0 || dy !== 0) {
      angle = Math.atan2(dy, dx);
    }

    this.state = 'dashing';
    this.stateTimer = 10; // durée du dash
    this.dashCooldown = 40; // recharge

    const dashSpeed = 11;
    this.vx = Math.cos(angle) * dashSpeed;
    this.vy = Math.sin(angle) * dashSpeed;

    // Sons et effets de particules
    soundManager.play('dash', { pan: (this.x - 400) / 400, volumeScale: 0.6 });
    this.particles?.emitDashDust(this.x, this.y, angle);

    return true;
  }

  /**
   * Action : Parer / Bloquer
   */
  public startBlock() {
    if (this.state === 'ko' || this.state === 'stunned' || this.state === 'dashing') return;
    this.state = 'blocking';
    this.stateTimer = 5; // Re-bloquer réactivement
  }

  /**
   * Vérifie si un coup porté touche cet adversaire
   * @param opponent Combattant adverse
   */
  public checkHit(opponent: Fighter): boolean {
    if (this.state !== 'punching' || this.stateTimer < 3 || this.stateTimer > 7) return false;
    if (opponent.state === 'ko') return false;

    // Calculer la position globale du poing attaquant
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);

    // Le poing actif se projette vers l'avant
    const punchDist = this.isHeavyPunch ? 65 : 45;
    const handX = this.x + punchDist * cos;
    const handY = this.y + punchDist * sin;

    // Distance entre le poing et le centre de l'adversaire
    const dist = Math.hypot(opponent.x - handX, opponent.y - handY);

    // Si la distance est inférieure au rayon de l'adversaire + le rayon du gant
    if (dist < opponent.radius + 10) {
      // Dégâts
      // Calcul des dégâts réduits (base + puissance de l'attaquant)
      const baseDamage = this.isHeavyPunch ? 1.0 : 0.4;
      let damage = baseDamage + (this.config.power * 0.05);
      let kbForce = this.isHeavyPunch ? 10 : 5;

      // Bonus d'arme
      if (this.equippedWeapon) {
        if (this.equippedWeapon === 'baseball_bat') {
          damage *= 1.8;
          kbForce = 24; // Recul phénoménal !
        } else if (this.equippedWeapon === 'knife') {
          damage *= 2.2;
        } else if (this.equippedWeapon === 'bottle') {
          damage *= 1.5;
        }
      }

      const isWeaponHit = this.equippedWeapon !== null;
      const actualDamage = opponent.takeDamage(damage, this.rotation, this.isHeavyPunch || isWeaponHit, kbForce, isWeaponHit);

      // Générer des particules
      const impactAngle = this.rotation;
      if (opponent.state === 'blocking' && actualDamage === 0) {
        this.particles?.emitBlockSparks(handX, handY);
      } else {
        this.particles?.emitHitSparks(handX, handY, impactAngle, this.isHeavyPunch || this.equippedWeapon !== null);
        
        // Si l'attaquant porte un couteau, on génère des étincelles supplémentaires rouges (sueur/sang)
        if (this.equippedWeapon === 'knife') {
          this.particles?.emitHitSparks(handX, handY, impactAngle + Math.PI, true);
        }

        // Gérer l'usure ou la casse de l'arme
        if (this.equippedWeapon) {
          if (this.equippedWeapon === 'bottle') {
            // Son de bouteille en verre qui se brise
            soundManager.play('block', { pan: (this.x - 400) / 400, pitchVariation: 0.3, volumeScale: 1.2 });
            // Étourdit longuement l'adversaire
            opponent.state = 'stunned';
            opponent.stateTimer = 55; // 0.9s de stun
            opponent.hitStunTimer = 45;
            this.clearWeapon();
          } else {
            this.weaponUses--;
            if (this.weaponUses <= 0) {
              this.clearWeapon();
            }
          }
        }

        // Ajouter de la rage/super à l'attaquant s'il réussit son coup
        this.rage = Math.min(this.maxRage, this.rage + (this.isHeavyPunch ? 15 : 6));
      }

      return true;
    }

    return false;
  }

  /**
   * Encaisser des dégâts avec recul spécifique
   * @returns Dégâts réels infligés
   */
  public takeDamage(amount: number, angle: number, isHeavy: boolean, customKbForce?: number, isWeaponHit: boolean = false): number {
    if (this.state === 'ko') return 0;

    // Si on pare
    if (this.state === 'blocking') {
      soundManager.play('block', { pan: (this.x - 400) / 400 });
      // Ajouter de la rage lors d'une parade réussie !
      this.rage = Math.min(this.maxRage, this.rage + 10);
      return 0; // Aucun dégât
    }

    // Calculer les dégâts réduits par 10% de la défense du défenseur
    const reducedAmount = Math.max(0.1, amount - (this.config.defense * 0.1));
    // Arrondir pour garder de la précision sur les petits dégâts
    const finalDamage = Math.round(reducedAmount * 10) / 10;
    this.hp = Math.max(0, this.hp - finalDamage);

    // Calculer le recul physique (Knockback)
    const kbForce = customKbForce ?? (isHeavy ? 10 : 5);
    this.vx += Math.cos(angle) * kbForce;
    this.vy += Math.sin(angle) * kbForce;

    // Sons
    soundManager.play('hit', { pan: (this.x - 400) / 400, pitchVariation: 0.1, volumeScale: isHeavy ? 1.0 : 0.7 });

    if (this.hp <= 0) {
      this.state = 'ko';
      soundManager.play('ko', { pan: (this.x - 400) / 400 });
    } else {
      // Étourdissement temporaire
      this.state = 'stunned';
      if (isWeaponHit) {
        this.stateTimer = 120; // 2 secondes de stun
        this.hitStunTimer = 120;
      } else {
        this.stateTimer = isHeavy ? 24 : 12;
        this.hitStunTimer = isHeavy ? 20 : 10;
      }
    }

    // Plus la vie est basse, plus on génère de la rage
    this.rage = Math.min(this.maxRage, this.rage + finalDamage * 0.8);

    return finalDamage;
  }

  /**
   * Effectue un super coup dévastateur si la jauge de rage est pleine !
   */
  public useSuper(): boolean {
    if (this.rage < this.maxRage || this.state === 'ko' || this.state === 'stunned') return false;

    this.rage = 0;
    this.state = 'punching';
    this.isHeavyPunch = true;
    this.stateTimer = 22;
    this.punchCooldown = 35;
    this.isLeftPunch = !this.isLeftPunch;

    // Super dash en avant + énorme coup de poing
    const dashSpeed = 10;
    this.vx = Math.cos(this.rotation) * dashSpeed;
    this.vy = Math.sin(this.rotation) * dashSpeed;

    // Son de super et particules de super
    soundManager.play('fight', { pan: (this.x - 400) / 400, volumeScale: 1.2 });
    if (this.particles) {
      this.particles.emitHitSparks(this.x, this.y, this.rotation, true);
      this.particles.emitDashDust(this.x, this.y, this.rotation);
      
      // Grosse explosion circulaire de particules d'énergie pour marquer le super !
      for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
        this.particles.emitHitSparks(this.x, this.y, angle, true);
      }
    }

    return true;
  }

  /**
   * Réinitialise le combattant pour une nouvelle manche
   */
  public reset(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.maxHp;
    this.rage = 0;
    this.state = 'idle';
    this.stateTimer = 0;
    this.punchCooldown = 0;
    this.blockCooldown = 0;
    this.dashCooldown = 0;
    this.hitStunTimer = 0;
    this.stunStarsTimer = 0;
    this.stunStarsContainer.visible = false;
    this.container.x = startX;
    this.container.y = startY;
    this.container.rotation = 0;
    this.headContainer.scale.set(1.0);
    this.headContainer.rotation = 0;
    this.clearWeapon();
  }

  /**
   * Équipe le combattant avec une arme
   */
  public equipWeapon(type: 'baseball_bat' | 'knife' | 'bottle') {
    this.equippedWeapon = type;
    this.weaponUses = type === 'baseball_bat' ? 5 : type === 'knife' ? 6 : 1;

    this.weaponGraphic.clear();

    if (type === 'baseball_bat') {
      // Longue batte en bois
      this.weaponGraphic.rect(-4, -28, 8, 28);
      this.weaponGraphic.fill({ color: 0xd2b48c }); // Couleur bois (tan)
      this.weaponGraphic.stroke({ width: 1.5, color: 0x5c4033 });
      // Grip noir
      this.weaponGraphic.rect(-3.5, -6, 7, 6);
      this.weaponGraphic.fill({ color: 0x111111 });
    } else if (type === 'knife') {
      // Couteau avec lame argentée
      this.weaponGraphic.rect(-2.5, -20, 5, 20);
      this.weaponGraphic.fill({ color: 0xdddddd });
      this.weaponGraphic.stroke({ width: 1, color: 0x777777 });
      // Garde du couteau
      this.weaponGraphic.rect(-5.5, -6, 11, 2.5);
      this.weaponGraphic.fill({ color: 0x222222 });
      // Manche marron
      this.weaponGraphic.rect(-2, -3.5, 4, 3.5);
      this.weaponGraphic.fill({ color: 0x8b4513 });
    } else if (type === 'bottle') {
      // Bouteille verte
      this.weaponGraphic.rect(-4.5, -16, 9, 16);
      this.weaponGraphic.fill({ color: 0x2e8b57, alpha: 0.85 }); // Vert bouteille
      this.weaponGraphic.stroke({ width: 1.2, color: 0x1e4d2b });
      // Goulot de bouteille
      this.weaponGraphic.rect(-2, -22, 4, 6);
      this.weaponGraphic.fill({ color: 0x2e8b57, alpha: 0.85 });
    }
  }

  /**
   * Retire l'arme équipée
   */
  public clearWeapon() {
    this.equippedWeapon = null;
    this.weaponUses = 0;
    this.weaponGraphic.clear();
  }
}
