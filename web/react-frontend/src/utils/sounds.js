/**
 * Sound utility for game audio management
 * Handles playing sound effects with overlap prevention and mute functionality
 */
import { createLogger } from '../utils/logger'
import { getSoundUrl } from './cdnPaths'

const logger = createLogger('SoundManager');
class SoundManager {
  constructor() {
    this.sounds = {};
    this.currentlyPlaying = new Set();
    this.isMuted = false;
    
    // Initialize sound files with CDN URLs
    this.soundFiles = {
      playCard: getSoundUrl('play_card.mp3'),
      acquireMerchant: getSoundUrl('acquire_merchant.mp3'),
      claimPointCard: getSoundUrl('claim_point_card.mp3'),
      rest: getSoundUrl('rest.mp3'),
      gameOver: getSoundUrl('game_over.mp3'),
      myTurn: getSoundUrl('my_turn.mp3'),
      nearlyEnd: getSoundUrl('nearly_end.mp3'),
    };
    
    // Load mute state from localStorage
    const savedMuteState = localStorage.getItem('gameSoundsMuted');
    this.isMuted = savedMuteState === 'true';
    
    // Preload all sounds
    this.preloadSounds();
  }
  
  preloadSounds() {
    Object.entries(this.soundFiles).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.addEventListener('error', (e) => {
        logger.warn(`Failed to load sound: ${path}`, e);
      });
      this.sounds[key] = audio;
    });
  }
  
  /**
   * Play a sound effect
   * @param {string} soundName - Name of the sound to play
   * @param {boolean} allowOverlap - Whether to allow this sound to overlap with others
   */
  play(soundName, allowOverlap = false) {
    if (this.isMuted) {
      logger.debug(`🔇 Sound muted: ${soundName}`);
      return;
    }
    
    const audio = this.sounds[soundName];
    if (!audio) {
      logger.warn(`❌ Sound not found: ${soundName}`);
      return;
    }
    
    // Prevent overlapping sounds unless explicitly allowed
    if (!allowOverlap && this.currentlyPlaying.has(soundName)) {
      logger.debug(`⏸️ Already playing: ${soundName}`);
      return;
    }
    
    logger.debug(`🔊 Playing sound: ${soundName} (overlap: ${allowOverlap})`);
    
    // Clone the audio for simultaneous plays if overlap is allowed
    const soundToPlay = allowOverlap ? audio.cloneNode() : audio;
    
    // Reset to beginning if not overlapping
    if (!allowOverlap) {
      soundToPlay.currentTime = 0;
    }
    
    // Track playing state
    this.currentlyPlaying.add(soundName);
    
    // Play the sound
    const playPromise = soundToPlay.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          logger.debug(`✅ Sound started: ${soundName}`);
        })
        .catch((error) => {
          logger.error(`❌ Error playing sound ${soundName}:`, error);
          this.currentlyPlaying.delete(soundName);
        });
    }
    
    // Remove from playing set when finished
    soundToPlay.addEventListener('ended', () => {
      this.currentlyPlaying.delete(soundName);
      logger.debug(`🏁 Sound ended: ${soundName}`);
    }, { once: true });
  }
  
  /**
   * Toggle mute state
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('gameSoundsMuted', this.isMuted.toString());
    
    // Stop all currently playing sounds when muting
    if (this.isMuted) {
      Object.values(this.sounds).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      this.currentlyPlaying.clear();
    }
    
    return this.isMuted;
  }
  
  /**
   * Set mute state
   */
  setMuted(muted) {
    this.isMuted = muted;
    localStorage.setItem('gameSoundsMuted', this.isMuted.toString());
    
    if (this.isMuted) {
      Object.values(this.sounds).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      this.currentlyPlaying.clear();
    }
  }
  
  /**
   * Get current mute state
   */
  getMuted() {
    return this.isMuted;
  }
  
  /**
   * Stop all sounds
   */
  stopAll() {
    Object.values(this.sounds).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.currentlyPlaying.clear();
  }
}

// Create singleton instance
const soundManager = new SoundManager();

export default soundManager;

// Export individual sound functions for convenience
export const playCardSound = () => soundManager.play('playCard');
export const playAcquireMerchantSound = () => soundManager.play('acquireMerchant');
export const playClaimPointCardSound = () => soundManager.play('claimPointCard');
export const playRestSound = () => soundManager.play('rest');
export const playGameOverSound = () => soundManager.play('gameOver', true);
export const playMyTurnSound = () => soundManager.play('myTurn');
export const playNearlyEndSound = () => soundManager.play('nearlyEnd', true);
