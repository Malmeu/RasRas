/**
 * Input.ts
 * Gère les entrées clavier pour le jeu multi-joueurs local (et solo)
 * en enregistrant l'état pressé des touches.
 */

export interface PlayerControls {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  punch: boolean;
  dash: boolean;
  block: boolean;
}

class InputManager {
  private pressedKeys: Set<string> = new Set();

  constructor() {
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

  /**
   * Retourne l'état des contrôles pour le Joueur 1
   * Gère à la fois ZQSD (AZERTY) et WASD (QWERTY)
   */
  public getPlayer1Controls(): PlayerControls {
    // Déplacement : W ou Z (haut), S (bas), A ou Q (gauche), D (droite)
    const up = this.pressedKeys.has('KeyW') || this.pressedKeys.has('KeyZ') || this.pressedKeys.has('ArrowUp') && !this.isPlayer2Active();
    const down = this.pressedKeys.has('KeyS') || this.pressedKeys.has('ArrowDown') && !this.isPlayer2Active();
    const left = this.pressedKeys.has('KeyA') || this.pressedKeys.has('KeyQ') || this.pressedKeys.has('ArrowLeft') && !this.isPlayer2Active();
    const right = this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight') && !this.isPlayer2Active();

    // Actions : F ou Espace (frappe), G ou ShiftGauche (dash), C ou E (parade)
    const punch = this.pressedKeys.has('KeyF') || this.pressedKeys.has('Space');
    const dash = this.pressedKeys.has('KeyG') || this.pressedKeys.has('ShiftLeft');
    const block = this.pressedKeys.has('KeyC') || this.pressedKeys.has('KeyE');

    return { up, down, left, right, punch, dash, block };
  }

  /**
   * Retourne l'état des contrôles pour le Joueur 2
   */
  public getPlayer2Controls(): PlayerControls {
    // Déplacement : Flèches directionnelles
    const up = this.pressedKeys.has('ArrowUp');
    const down = this.pressedKeys.has('ArrowDown');
    const left = this.pressedKeys.has('ArrowLeft');
    const right = this.pressedKeys.has('ArrowRight');

    // Actions : Pavé numérique (Numpad1, Numpad2, Numpad3) ou touches clavier ordinaires (M / "," / ".")
    // Frapper: Numpad1 ou KeyK
    // Dash: Numpad2 ou KeyL
    // Bloquer: Numpad3 ou KeyI
    const punch = this.pressedKeys.has('Numpad1') || this.pressedKeys.has('KeyK') || this.pressedKeys.has('Slash');
    const dash = this.pressedKeys.has('Numpad2') || this.pressedKeys.has('KeyL') || this.pressedKeys.has('Period');
    const block = this.pressedKeys.has('Numpad3') || this.pressedKeys.has('KeyI') || this.pressedKeys.has('Comma');

    return { up, down, left, right, punch, dash, block };
  }

  /**
   * Détecte si le joueur 2 utilise activement des touches
   * (Pour éviter que le joueur 1 contrôle les deux en mode solo s'il utilise les flèches)
   */
  private isPlayer2Active(): boolean {
    return (
      this.pressedKeys.has('ArrowUp') ||
      this.pressedKeys.has('ArrowDown') ||
      this.pressedKeys.has('ArrowLeft') ||
      this.pressedKeys.has('ArrowRight') ||
      this.pressedKeys.has('KeyK') ||
      this.pressedKeys.has('KeyL')
    );
  }

  /**
   * Nettoie les listeners d'événements
   */
  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
    }
  }
}

export const inputManager = new InputManager();
