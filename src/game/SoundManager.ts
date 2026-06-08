/**
 * SoundManager.ts
 * Gère l'audio du jeu RasRas à l'aide de la Web Audio API.
 * Propose une synthèse sonore de secours (fallback) si les fichiers audio ne sont pas trouvés,
 * et intègre du Pitch Shifting aléatoire et du Panning stéréo.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private loaded: boolean = false;
  private bgmSource: AudioBufferSourceNode | null = null;
  private bgmGainNode: GainNode | null = null;
  private masterVolume: number = 0.8;
  private soundVolume: number = 0.9;
  private bgmVolume: number = 0.5;

  private soundPaths: Record<string, string> = {
    punch: '/assets/sounds/punch.mp3',
    punch_heavy: '/assets/sounds/punch_heavy.mp3',
    dash: '/assets/sounds/dash.mp3',
    hit: '/assets/sounds/hit.mp3',
    block: '/assets/sounds/block.mp3',
    ko: '/assets/sounds/ko.mp3',
    cheer: '/assets/sounds/cheer.mp3',
    countdown: '/assets/sounds/countdown.mp3',
    fight: '/assets/sounds/fight.mp3',
    bgm: '/assets/sounds/ambiance.mp3',
    final: '/assets/sounds/final.mp3',
  };

  constructor() {
    this.loadVolume();
  }

  private loadVolume() {
    try {
      if (typeof window !== 'undefined') {
        const savedVolume = localStorage.getItem('rasras_master_volume');
        if (savedVolume !== null) {
          this.masterVolume = parseFloat(savedVolume);
        }
      }
    } catch (e) {
      console.error('Erreur chargement volume:', e);
    }
  }

  public setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.bgmGainNode) {
      this.bgmGainNode.gain.value = this.masterVolume * this.bgmVolume;
    }
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('rasras_master_volume', this.masterVolume.toString());
      }
    } catch (e) {}
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Initialise le contexte audio après une interaction utilisateur
   */
  public init() {
    if (this.ctx) return;
    
    // Support des anciens navigateurs
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
      this.preloadSounds();
    } else {
      console.warn("Web Audio API n'est pas supportée par ce navigateur.");
    }
  }

  /**
   * Précharge les fichiers sons s'ils existent
   */
  private async preloadSounds() {
    if (!this.ctx) return;

    const promises = Object.entries(this.soundPaths).map(async ([key, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Fichier non trouvé (404): ${url}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
        this.buffers.set(key, audioBuffer);
      } catch (err) {
        // En cas d'erreur de chargement (ex: 404), on utilisera la synthèse
        console.warn(`Impossible de charger le son "${key}" depuis "${url}". Fallback synthétique activé.`);
      }
    });

    await Promise.all(promises);
    this.loaded = true;
  }

  /**
   * Indique si tous les sons sont chargés
   */
  public isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Joue un son avec pitch shifting et panning
   * @param name Nom de l'effet sonore
   * @param options Paramètres de lecture (pan, pitchVariation, volumeScale)
   */
  public play(name: string, options?: { pan?: number; pitchVariation?: number; volumeScale?: number }) {
    this.init(); // S'assurer que le contexte est initialisé
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch((err) => console.warn("Impossible de relancer AudioContext:", err));
    }

    const pan = options?.pan ?? 0; // -1 (gauche) à 1 (droite)
    const pitchVariation = options?.pitchVariation ?? 0.15; // +/- 15% de pitch par défaut
    const volumeScale = options?.volumeScale ?? 1.0;

    const buffer = this.buffers.get(name);

    if (buffer) {
      // Lecture du fichier audio chargé
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      // Pitch Shifting Aléatoire
      const randomPitch = 1 + (Math.random() - 0.5) * 2 * pitchVariation;
      source.playbackRate.value = randomPitch;

      // Volume & Panning Nodes
      const gainNode = this.ctx.createGain();
      gainNode.gain.value = this.masterVolume * this.soundVolume * volumeScale;

      const pannerNode = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      
      // Assemblage du graphe audio
      let lastNode: AudioNode = source;
      
      if (pannerNode) {
        pannerNode.pan.value = Math.max(-1, Math.min(1, pan));
        lastNode.connect(pannerNode);
        lastNode = pannerNode;
      }
      
      lastNode.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      source.start(0);
    } else {
      // Fallback Synthétique désactivé : on ne joue rien
    }
  }

  public playBGM() {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch((err) => console.warn("Impossible de relancer AudioContext:", err));
    }

    // Si déjà lancée, on ne relance pas
    if (this.bgmSource) return;

    const buffer = this.buffers.get('bgm');
    this.bgmGainNode = this.ctx.createGain();
    this.bgmGainNode.gain.value = this.masterVolume * this.bgmVolume;
    this.bgmGainNode.connect(this.ctx.destination);

    if (buffer) {
      this.bgmSource = this.ctx.createBufferSource();
      this.bgmSource.buffer = buffer;
      this.bgmSource.loop = true;
      this.bgmSource.connect(this.bgmGainNode);
      this.bgmSource.start(0);
    } else {
      // Fallback retiré (pas de musique synthétique)
    }
  }

  /**
   * Arrête la musique de fond
   */
  public stopBGM() {
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
      } catch (e) {}
      this.bgmSource = null;
    }
  }

  /**
   * Modifie dynamiquement la vitesse de lecture (pitch) du BGM (par exemple quand un joueur va perdre)
   */
  public setBgmSpeed(speed: number) {
    if (this.bgmSource) {
      this.bgmSource.playbackRate.setValueAtTime(speed, this.ctx?.currentTime ?? 0);
    }
  }
}

// Singleton
export const soundManager = new SoundManager();
