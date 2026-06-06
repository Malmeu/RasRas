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

  // Liste des sons configurés
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
    bgm: '/assets/sounds/battle_bgm.mp3',
  };

  constructor() {
    // L'AudioContext est initialisé de manière paresseuse (lazy-load) au premier clic ou interaction de l'utilisateur
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
      // Fallback Synthétique : on crée le son mathématiquement !
      this.playSynthetic(name, pan, pitchVariation, volumeScale);
    }
  }

  /**
   * Générateur de sons de secours par synthèse additive avec la Web Audio API
   */
  private playSynthetic(name: string, pan: number, pitchVariation: number, volumeScale: number) {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const pannerNode = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    
    // Variation de pitch pour la synthèse
    const pitchFactor = 1 + (Math.random() - 0.5) * 2 * pitchVariation;
    const now = this.ctx.currentTime;

    let duration = 0.1;

    switch (name) {
      case 'punch':
        // Un coup sec et court
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150 * pitchFactor, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
        
        gainNode.gain.setValueAtTime(0.6 * volumeScale, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        duration = 0.08;
        break;

      case 'punch_heavy':
        // Un gros coup percutant (avec plus de basses)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120 * pitchFactor, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.15);
        
        gainNode.gain.setValueAtTime(0.9 * volumeScale, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        duration = 0.15;
        break;

      case 'dash':
        // Glissando rapide aigu/bruit de vent
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300 * pitchFactor, now);
        osc.frequency.exponentialRampToValueAtTime(900 * pitchFactor, now + 0.12);
        
        gainNode.gain.setValueAtTime(0.3 * volumeScale, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.12);
        duration = 0.12;
        break;

      case 'hit':
        // Un son d'impact lourd avec bruit blanc simulé
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90 * pitchFactor, now);
        osc.frequency.linearRampToValueAtTime(10, now + 0.18);
        
        gainNode.gain.setValueAtTime(0.8 * volumeScale, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        duration = 0.18;
        break;

      case 'block':
        // Son métallique sec (aigu et rapide)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 * pitchFactor, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.05);
        
        gainNode.gain.setValueAtTime(0.4 * volumeScale, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        duration = 0.05;
        break;

      case 'ko':
        // Ralentissement dramatique vers les graves
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200 * pitchFactor, now);
        osc.frequency.linearRampToValueAtTime(30, now + 1.2);
        
        gainNode.gain.setValueAtTime(0.8 * volumeScale, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
        duration = 1.2;
        break;

      case 'countdown':
        // Un bip d'horloge
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        
        gainNode.gain.setValueAtTime(0.4 * volumeScale, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        duration = 0.15;
        break;

      case 'fight':
        // Un double-bip plus dynamique
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(1000, now + 0.1);
        
        gainNode.gain.setValueAtTime(0.6 * volumeScale, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        duration = 0.25;
        break;

      case 'cheer':
        // Bruit de foule simulé avec filtre passe-bande sur bruit (ou onde de scie empilée)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(300, now + 1.0);
        
        gainNode.gain.setValueAtTime(0.2 * volumeScale, now);
        gainNode.gain.linearRampToValueAtTime(0.2 * volumeScale, now + 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
        duration = 1.5;
        break;

      default:
        // Par défaut, un bip simple
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        duration = 0.1;
        break;
    }

    // Connecter les nodes
    let lastNode: AudioNode = osc;
    
    if (pannerNode) {
      pannerNode.pan.value = Math.max(-1, Math.min(1, pan));
      lastNode.connect(pannerNode);
      lastNode = pannerNode;
    }

    lastNode.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Joue la musique de fond en boucle
   */
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
      // Fallback Synthétique pour la musique : une ligne de basse rétro simple !
      this.playSyntheticBGM();
    }
  }

  /**
   * Ligne de basse de secours générée en boucle pour le BGM
   */
  private syntheticBgmInterval: any = null;
  private playSyntheticBGM() {
    if (!this.ctx || this.syntheticBgmInterval) return;

    let beat = 0;
    // Ligne de basse rétro (tempo 125 BPM -> 4 notes par seconde -> 240ms par note)
    const tempo = 240; // ms
    const scale = [55, 65.4, 73.4, 82.4, 98.0, 82.4, 73.4, 65.4]; // Notes de basse (A1, C2, D2, E2, G2, E2, D2, C2)

    this.syntheticBgmInterval = setInterval(() => {
      if (!this.ctx || this.ctx.state === 'suspended') return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sawtooth';
      // Joue une note de la gamme en boucle
      const noteFreq = scale[beat % scale.length];
      osc.frequency.setValueAtTime(noteFreq, now);

      // Filtre passe-bas pour donner un côté basse étouffée sympa
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250, now);

      gainNode.gain.setValueAtTime(this.masterVolume * this.bgmVolume * 0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.23);

      // Ajouter un petit bruit de charleston (hi-hat) sur les temps faibles
      if (beat % 2 === 1) {
        this.playSyntheticHiHat(now + 0.05);
      }

      beat++;
    }, tempo);
  }

  /**
   * Joue un charleston synthétique de secours
   */
  private playSyntheticHiHat(time: number) {
    if (!this.ctx) return;
    
    // Utilisation d'un oscillateur triangle à très haute fréquence
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(8000, time);
    
    gainNode.gain.setValueAtTime(this.masterVolume * this.bgmVolume * 0.1, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    osc.start(time);
    osc.stop(time + 0.05);
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
    
    if (this.syntheticBgmInterval) {
      clearInterval(this.syntheticBgmInterval);
      this.syntheticBgmInterval = null;
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
