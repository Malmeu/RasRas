/**
 * ParticleSystem.ts
 * Gère l'émission et la mise à jour des effets de particules PixiJS.
 * Utilise des objets Graphics dessinés à la volée pour des performances optimales et sans textures externes.
 */

import { Container, Graphics } from 'pixi.js';

interface Particle {
  graphic: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  scale: number;
  color: number;
  life: number;
  maxLife: number;
  type: 'dust' | 'spark' | 'star' | 'block' | 'flame' | 'glass';
  rotationSpeed?: number;
}

export class ParticleSystem {
  private container: Container;
  private particles: Particle[] = [];

  constructor(container: Container) {
    this.container = container;
  }

  /**
   * Met à jour toutes les particules actives
   * @param dt Delta time (multiplicateur de vitesse)
   */
  public update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        // Supprimer la particule
        this.container.removeChild(p.graphic);
        p.graphic.destroy();
        this.particles.splice(i, 1);
        continue;
      }

      // Appliquer la vitesse
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Friction selon le type
      if (p.type === 'dust' || p.type === 'flame') {
        p.vx *= Math.pow(0.92, dt);
        p.vy *= Math.pow(0.92, dt);
        if (p.type === 'flame') {
          p.vy -= 0.14 * dt; // Les flammes montent
        }
      } else if (p.type === 'spark' || p.type === 'block' || p.type === 'glass') {
        p.vx *= Math.pow(0.96, dt);
        p.vy *= Math.pow(0.96, dt);
        if (p.type === 'glass') {
          p.vy += 0.22 * dt; // Gravité sur les éclats de verre
        }
      }

      // Gravité sur certaines particules
      if (p.type === 'star') {
        // Mouvement circulaire
        const angle = (p.life / p.maxLife) * Math.PI * 4;
        p.x += Math.cos(angle) * 0.8 * dt;
        p.y += Math.sin(angle) * 0.5 * dt;
      }

      // Mettre à jour les propriétés visuelles de l'objet PixiJS
      p.graphic.x = p.x;
      p.graphic.y = p.y;
      p.graphic.alpha = p.life / p.maxLife;

      const progress = p.life / p.maxLife;
      if (p.type === 'dust' || p.type === 'flame' || p.type === 'glass') {
        p.graphic.scale.set(p.scale * progress);
      } else {
        p.graphic.scale.set(p.scale);
      }

      if (p.rotationSpeed) {
        p.graphic.rotation += p.rotationSpeed * dt;
      }
    }
  }

  /**
   * Émet de la poussière derrière un combattant qui fait un dash
   */
  public emitDashDust(x: number, y: number, angle: number) {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const graphic = new Graphics();
      // Dessiner un petit cercle de poussière blanc/gris
      graphic.circle(0, 0, 6 + Math.random() * 4);
      graphic.fill({ color: 0xeeeeee, alpha: 0.6 });

      const oppositeAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5;
      const speed = 1.5 + Math.random() * 2.5;

      const p: Particle = {
        graphic,
        x,
        y,
        vx: Math.cos(oppositeAngle) * speed,
        vy: Math.sin(oppositeAngle) * speed,
        alpha: 0.6,
        scale: 1,
        color: 0xeeeeee,
        life: 15 + Math.random() * 10,
        maxLife: 25,
        type: 'dust',
      };

      this.container.addChild(graphic);
      this.particles.push(p);
    }
  }

  /**
   * Émet des étincelles lors d'un coup réussi
   */
  public emitHitSparks(x: number, y: number, impactAngle: number, isHeavy: boolean = false) {
    const count = isHeavy ? 25 : 12;
    const colors = isHeavy ? [0xff3300, 0xffaa00, 0xffff00] : [0xffaa00, 0xffff00];

    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const graphic = new Graphics();
      
      // Tracer une ligne d'étincelle
      const length = 8 + Math.random() * 12;
      graphic.moveTo(-length / 2, 0);
      graphic.lineTo(length / 2, 0);
      graphic.stroke({ width: 2.5 + Math.random() * 2, color: color });

      const scatterAngle = impactAngle + (Math.random() - 0.5) * 1.8;
      const speed = (isHeavy ? 4 : 2.5) + Math.random() * (isHeavy ? 6 : 4);

      // Rotation de l'étincelle dans le sens du mouvement
      graphic.rotation = scatterAngle;

      const p: Particle = {
        graphic,
        x,
        y,
        vx: Math.cos(scatterAngle) * speed,
        vy: Math.sin(scatterAngle) * speed,
        alpha: 1,
        scale: 1,
        color,
        life: 10 + Math.random() * 15,
        maxLife: 25,
        type: 'spark',
      };

      this.container.addChild(graphic);
      this.particles.push(p);
    }
  }

  /**
   * Émet des particules bleues en cercle lors d'un blocage réussi
   */
  public emitBlockSparks(x: number, y: number) {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const color = 0x00ccff;
      const graphic = new Graphics();
      
      // Étoiles ou carrés bleus
      graphic.rect(-3, -3, 6, 6);
      graphic.fill({ color });

      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const speed = 2 + Math.random() * 3;

      const p: Particle = {
        graphic,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        scale: 0.8 + Math.random() * 0.4,
        color,
        life: 12 + Math.random() * 8,
        maxLife: 20,
        type: 'block',
        rotationSpeed: 0.1 + Math.random() * 0.2,
      };

      this.container.addChild(graphic);
      this.particles.push(p);
    }
  }

  /**
   * Émet des petites étoiles jaunes qui gravitent lors d'un étourdissement (stun)
   */
  public emitStunStars(x: number, y: number) {
    const color = 0xffd700; // Or
    const graphic = new Graphics();
    
    // Dessiner une forme d'étoile simple à 4 branches
    graphic.moveTo(0, -6);
    graphic.lineTo(2, -2);
    graphic.lineTo(6, 0);
    graphic.lineTo(2, 2);
    graphic.lineTo(0, 6);
    graphic.lineTo(-2, 2);
    graphic.lineTo(-6, 0);
    graphic.lineTo(-2, -2);
    graphic.closePath();
    graphic.fill({ color });

    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5;

    const p: Particle = {
      graphic,
      x: x + (Math.random() - 0.5) * 20,
      y: y - 25 + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      scale: 0.7 + Math.random() * 0.5,
      color,
      life: 30 + Math.random() * 15,
      maxLife: 45,
      type: 'star',
      rotationSpeed: 0.05 + Math.random() * 0.1,
    };

    this.container.addChild(graphic);
    this.particles.push(p);
  }

  /**
   * Émet des particules de fumée colorée pour un fumigène
   */
  public emitFumigeneSmoke(x: number, y: number, color: number) {
    const graphic = new Graphics();
    // Dessiner un petit cercle de fumée flou/semi-transparent
    graphic.circle(0, 0, 7 + Math.random() * 6);
    graphic.fill({ color, alpha: 0.4 });

    // Vitesse lente vers le haut avec un léger balancement horizontal
    const vx = (Math.random() - 0.5) * 0.7;
    const vy = -1.1 - Math.random() * 0.9;

    const p: Particle = {
      graphic,
      x,
      y,
      vx,
      vy,
      alpha: 0.4,
      scale: 1,
      color,
      life: 35 + Math.random() * 20,
      maxLife: 55,
      type: 'dust', // Utilise le type dust pour rétrécir à la fin
    };

    this.container.addChild(graphic);
    this.particles.push(p);
  }

  /**
   * Émet une explosion de particules géante pour le K.O. final
   */
  public emitKOSparks(x: number, y: number) {
    // 1. Éjecter de grandes étincelles dans toutes les directions (360°)
    const sparksCount = 45;
    const colors = [0xff0055, 0xffaa00, 0xffffff, 0xff0033];
    
    for (let i = 0; i < sparksCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const graphic = new Graphics();
      const length = 15 + Math.random() * 22;
      graphic.moveTo(-length / 2, 0);
      graphic.lineTo(length / 2, 0);
      graphic.stroke({ width: 3.5 + Math.random() * 3, color: color });

      const angle = (i / sparksCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
      const speed = 7 + Math.random() * 9;
      graphic.rotation = angle;

      const p: Particle = {
        graphic,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1.0,
        scale: 1.25,
        color,
        life: 25 + Math.random() * 25,
        maxLife: 50,
        type: 'spark',
      };

      this.container.addChild(graphic);
      this.particles.push(p);
    }

    // 2. Éjecter des anneaux de poussière/fumée géante (onde de choc)
    const dustCount = 18;
    for (let i = 0; i < dustCount; i++) {
      const graphic = new Graphics();
      graphic.circle(0, 0, 14 + Math.random() * 12);
      graphic.fill({ color: 0xff3366, alpha: 0.3 });

      const angle = (i / dustCount) * Math.PI * 2;
      const speed = 2.5 + Math.random() * 3.5;

      const p: Particle = {
        graphic,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 0.3,
        scale: 1.1,
        color: 0xff3366,
        life: 35 + Math.random() * 15,
        maxLife: 50,
        type: 'dust',
      };

      this.container.addChild(graphic);
      this.particles.push(p);
    }
  }

  /**
   * Émet des particules de flammes pour la charge de Kahina
   */
  public emitFlameParticles(x: number, y: number) {
    const count = 3;
    const colors = [0xff4500, 0xff8c00, 0xffd700]; // Orange-Rouge, Orange foncé, Jaune d'or
    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const graphic = new Graphics();
      graphic.circle(0, 0, 4 + Math.random() * 5);
      graphic.fill({ color, alpha: 0.8 });

      const scatterAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
      const speed = 1.0 + Math.random() * 2.0;

      const p: Particle = {
        graphic,
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: Math.cos(scatterAngle) * speed,
        vy: Math.sin(scatterAngle) * speed,
        alpha: 0.8,
        scale: 1,
        color,
        life: 10 + Math.random() * 10,
        maxLife: 20,
        type: 'flame',
      };

      this.container.addChild(graphic);
      this.particles.push(p);
    }
  }

  /**
   * Émet des éclats de verre lorsque le projectile de Lamine se brise
   */
  public emitGlassShards(x: number, y: number) {
    const count = 15;
    const color = 0x34d399; // Émeraude translucide
    for (let i = 0; i < count; i++) {
      const graphic = new Graphics();
      graphic.moveTo(0, -4);
      graphic.lineTo(3, 3);
      graphic.lineTo(-3, 3);
      graphic.closePath();
      graphic.fill({ color, alpha: 0.75 });
      graphic.stroke({ width: 0.8, color: 0xffffff, alpha: 0.4 });

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 5.0;

      const p: Particle = {
        graphic,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 0.8,
        scale: 0.8 + Math.random() * 0.5,
        color,
        life: 15 + Math.random() * 15,
        maxLife: 30,
        type: 'glass',
        rotationSpeed: (Math.random() - 0.5) * 0.4,
      };

      this.container.addChild(graphic);
      this.particles.push(p);
    }
  }

  /**
   * Nettoie toutes les particules à la fin
   */
  public destroy() {
    this.particles.forEach((p) => {
      this.container.removeChild(p.graphic);
      p.graphic.destroy();
    });
    this.particles = [];
  }
}
