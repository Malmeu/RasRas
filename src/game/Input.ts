/**
 * Input.ts
 * Gère les entrées clavier pour le jeu multi-joueurs local (et solo)
 * en enregistrant l'état pressé des touches et en permettant leur réassignation.
 */

export interface PlayerControls {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  punch: boolean;
  dash: boolean;
  block: boolean;
  super: boolean;
}

export interface KeyMapping {
  up: string;
  down: string;
  left: string;
  right: string;
  punch: string;
  dash: string;
  block: string;
  super: string;
}

class InputManager {
  private pressedKeys: Set<string> = new Set();
  
  public p1Keys: KeyMapping = {
    up: 'KeyW',
    down: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    punch: 'Space',
    dash: 'ShiftLeft',
    block: 'KeyC',
    super: 'KeyR',
  };

  public p2Keys: KeyMapping = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    punch: 'KeyK',
    dash: 'KeyL',
    block: 'KeyI',
    super: 'KeyO',
  };

  constructor() {
    this.loadKeys();
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      // Éviter le défilement de la page avec les flèches et la barre espace
      window.addEventListener('keydown', (e) => {
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
        }
      });
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.pressedKeys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.pressedKeys.delete(e.code);
  };

  public virtualInputs = {
    up: false,
    down: false,
    left: false,
    right: false,
    punch: false,
    dash: false,
    block: false,
    super: false,
  };

  private loadKeys() {
    try {
      if (typeof window !== 'undefined') {
        const savedP1 = localStorage.getItem('rasras_p1_keys');
        const savedP2 = localStorage.getItem('rasras_p2_keys');
        if (savedP1) this.p1Keys = JSON.parse(savedP1);
        if (savedP2) this.p2Keys = JSON.parse(savedP2);
      }
    } catch (e) {
      console.error('Erreur chargement touches clavier:', e);
    }
  }

  public saveKeys() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('rasras_p1_keys', JSON.stringify(this.p1Keys));
        localStorage.setItem('rasras_p2_keys', JSON.stringify(this.p2Keys));
      }
    } catch (e) {
      console.error('Erreur sauvegarde touches clavier:', e);
    }
  }

  /**
   * Retourne l'état des contrôles pour le Joueur 1
   */
  public getPlayer1Controls(): PlayerControls {
    let up = this.pressedKeys.has(this.p1Keys.up) || this.virtualInputs.up;
    let down = this.pressedKeys.has(this.p1Keys.down) || this.virtualInputs.down;
    let left = this.pressedKeys.has(this.p1Keys.left) || this.virtualInputs.left;
    let right = this.pressedKeys.has(this.p1Keys.right) || this.virtualInputs.right;

    // Support par défaut de AZERTY si touches par défaut non réassignées (WASD / ZQSD)
    if (this.p1Keys.up === 'KeyW' && !this.pressedKeys.has('KeyW')) {
      if (this.pressedKeys.has('KeyZ')) up = true;
    }
    if (this.p1Keys.left === 'KeyA' && !this.pressedKeys.has('KeyA')) {
      if (this.pressedKeys.has('KeyQ')) left = true;
    }

    // Support des flèches directionnelles si joueur 2 n'est pas actif
    if (!this.isPlayer2Active()) {
      if (this.pressedKeys.has('ArrowUp')) up = true;
      if (this.pressedKeys.has('ArrowDown')) down = true;
      if (this.pressedKeys.has('ArrowLeft')) left = true;
      if (this.pressedKeys.has('ArrowRight')) right = true;
    }

    const punch = this.pressedKeys.has(this.p1Keys.punch) || this.pressedKeys.has('KeyF') || this.virtualInputs.punch;
    const dash = this.pressedKeys.has(this.p1Keys.dash) || this.pressedKeys.has('KeyG') || this.virtualInputs.dash;
    const block = this.pressedKeys.has(this.p1Keys.block) || this.pressedKeys.has('KeyE') || this.virtualInputs.block;
    const superAction = this.pressedKeys.has(this.p1Keys.super) || this.virtualInputs.super;

    return { up, down, left, right, punch, dash, block, super: superAction };
  }

  /**
   * Retourne l'état des contrôles pour le Joueur 2
   */
  public getPlayer2Controls(): PlayerControls {
    const up = this.pressedKeys.has(this.p2Keys.up);
    const down = this.pressedKeys.has(this.p2Keys.down);
    const left = this.pressedKeys.has(this.p2Keys.left);
    const right = this.pressedKeys.has(this.p2Keys.right);

    const punch = this.pressedKeys.has(this.p2Keys.punch) || this.pressedKeys.has('Numpad1');
    const dash = this.pressedKeys.has(this.p2Keys.dash) || this.pressedKeys.has('Numpad2');
    const block = this.pressedKeys.has(this.p2Keys.block) || this.pressedKeys.has('Numpad3');
    const superAction = this.pressedKeys.has(this.p2Keys.super) || this.pressedKeys.has('Numpad0');

    return { up, down, left, right, punch, dash, block, super: superAction };
  }

  /**
   * Détecte si le joueur 2 utilise activement des touches
   */
  private isPlayer2Active(): boolean {
    return (
      this.pressedKeys.has(this.p2Keys.up) ||
      this.pressedKeys.has(this.p2Keys.down) ||
      this.pressedKeys.has(this.p2Keys.left) ||
      this.pressedKeys.has(this.p2Keys.right) ||
      this.pressedKeys.has(this.p2Keys.punch) ||
      this.pressedKeys.has(this.p2Keys.dash) ||
      this.pressedKeys.has(this.p2Keys.block) ||
      this.pressedKeys.has(this.p2Keys.super) ||
      this.pressedKeys.has('KeyK') ||
      this.pressedKeys.has('KeyL')
    );
  }

  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
    }
  }
}

export const inputManager = new InputManager();
