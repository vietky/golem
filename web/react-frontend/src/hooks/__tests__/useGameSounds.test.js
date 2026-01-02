import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useGameSounds from '../useGameSounds';
import soundManager from '../../utils/sounds';
import useGameStore from '../../store/gameStore';

// Mock the sound manager
vi.mock('../../utils/sounds', () => ({
  default: {
    play: vi.fn(),
    toggleMute: vi.fn(),
    setMuted: vi.fn(),
    getMuted: vi.fn(() => false),
  }
}));

// Mock the game store
vi.mock('../../store/gameStore');

describe('useGameSounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock state
    useGameStore.mockReturnValue({
      gameState: null,
      previousGameState: null,
      myPlayer: null,
      currentPlayer: null,
      playerId: null,
      isSpectator: false,
    });
  });

  describe('My Turn Sound', () => {
    it('should play sound when it becomes my turn', () => {
      const { rerender } = renderHook(() => useGameSounds());
      
      // Initial state - not my turn
      useGameStore.mockReturnValue({
        gameState: { players: [] },
        previousGameState: null,
        myPlayer: { id: 1 },
        currentPlayer: { id: 2, name: 'Player 2' },
        playerId: 1,
        isSpectator: false,
      });
      
      rerender();
      
      // Change to my turn
      useGameStore.mockReturnValue({
        gameState: { players: [] },
        previousGameState: null,
        myPlayer: { id: 1 },
        currentPlayer: { id: 1, name: 'Me' },
        playerId: 1,
        isSpectator: false,
      });
      
      rerender();
      
      expect(soundManager.play).toHaveBeenCalledWith('myTurn');
    });

    it('should not play sound if already my turn', () => {
      useGameStore.mockReturnValue({
        gameState: { players: [] },
        previousGameState: null,
        myPlayer: { id: 1 },
        currentPlayer: { id: 1, name: 'Me' },
        playerId: 1,
        isSpectator: false,
      });
      
      const { rerender } = renderHook(() => useGameSounds());
      rerender();
      
      // Should not call play again
      expect(soundManager.play).not.toHaveBeenCalled();
    });

    it('should not play sound in spectator mode', () => {
      useGameStore.mockReturnValue({
        gameState: { players: [] },
        previousGameState: null,
        myPlayer: null,
        currentPlayer: { id: 1, name: 'Player 1' },
        playerId: null,
        isSpectator: true,
      });
      
      renderHook(() => useGameSounds());
      
      expect(soundManager.play).not.toHaveBeenCalled();
    });
  });

  describe('Nearly End Sound', () => {
    it('should play sound when someone reaches 4 golems', () => {
      const { rerender } = renderHook(() => useGameSounds());
      
      // Initial state - no one has 4 golems
      useGameStore.mockReturnValue({
        gameState: {
          players: [
            { id: 1, pointCards: [1, 2, 3] },
            { id: 2, pointCards: [1, 2] },
          ]
        },
        previousGameState: null,
        myPlayer: { id: 1 },
        currentPlayer: { id: 1 },
        playerId: 1,
        isSpectator: false,
      });
      
      rerender();
      
      // Someone gets 4 golems
      useGameStore.mockReturnValue({
        gameState: {
          players: [
            { id: 1, pointCards: [1, 2, 3, 4] },
            { id: 2, pointCards: [1, 2] },
          ]
        },
        previousGameState: null,
        myPlayer: { id: 1 },
        currentPlayer: { id: 1 },
        playerId: 1,
        isSpectator: false,
      });
      
      rerender();
      
      expect(soundManager.play).toHaveBeenCalledWith('nearlyEnd', true);
    });

    it('should only play nearly end sound once', () => {
      useGameStore.mockReturnValue({
        gameState: {
          players: [
            { id: 1, pointCards: [1, 2, 3, 4] },
          ]
        },
        previousGameState: null,
        myPlayer: { id: 1 },
        currentPlayer: { id: 1 },
        playerId: 1,
        isSpectator: false,
      });
      
      const { rerender } = renderHook(() => useGameSounds());
      rerender();
      rerender();
      
      // Should only be called once despite multiple rerenders
      expect(soundManager.play).toHaveBeenCalledTimes(1);
    });
  });

  describe('Game Over Sound', () => {
    it('should play sound when game ends', () => {
      const { rerender } = renderHook(() => useGameSounds());
      
      // Game ongoing
      useGameStore.mockReturnValue({
        gameState: { gameOver: false },
        previousGameState: null,
        myPlayer: { id: 1 },
        currentPlayer: { id: 1 },
        playerId: 1,
        isSpectator: false,
      });
      
      rerender();
      
      // Game over
      useGameStore.mockReturnValue({
        gameState: { gameOver: true },
        previousGameState: null,
        myPlayer: { id: 1 },
        currentPlayer: { id: 1 },
        playerId: 1,
        isSpectator: false,
      });
      
      rerender();
      
      expect(soundManager.play).toHaveBeenCalledWith('gameOver', true);
    });
  });

  describe('Play Card Sound', () => {
    it('should play sound when I play a card', () => {
      const { rerender } = renderHook(() => useGameSounds());
      
      // Initial state
      const previousState = {
        players: [
          { id: 1, playedCards: [] }
        ]
      };
      
      useGameStore.mockReturnValue({
        gameState: { players: [] },
        previousGameState: previousState,
        myPlayer: { id: 1, playedCards: [] },
        currentPlayer: { id: 1 },
        playerId: 1,
        isSpectator: false,
      });
      
      rerender();
      
      // After playing a card
      useGameStore.mockReturnValue({
        gameState: { players: [] },
        previousGameState: previousState,
        myPlayer: { id: 1, playedCards: [{ id: 1 }] },
        currentPlayer: { id: 1 },
        playerId: 1,
        isSpectator: false,
      });
      
      rerender();
      
      expect(soundManager.play).toHaveBeenCalledWith('playCard');
    });

    it('should not play sound for opponent playing a card', () => {
      const previousState = {
        players: [
          { id: 1, playedCards: [] },
          { id: 2, playedCards: [] }
        ]
      };
      
      useGameStore.mockReturnValue({
        gameState: { players: [] },
        previousGameState: previousState,
        myPlayer: { id: 1, playedCards: [] },
        currentPlayer: { id: 2 },
        playerId: 1,
        isSpectator: false,
      });
      
      renderHook(() => useGameSounds());
      
      expect(soundManager.play).not.toHaveBeenCalledWith('playCard');
    });
  });

  describe('Acquire Merchant Sound', () => {
    it('should play sound when I acquire a card', () => {
      const { rerender } = renderHook(() => useGameSounds());
      
      // Initial state
      const previousState = {
        players: [
          { id: 1, hand: [{ id: 1 }] }
        ]
      };
      
      useGameStore.mockReturnValue({
        gameState: { players: [] },
        previousGameState: previousState,
        myPlayer: { id: 1, hand: [{ id: 1 }] },
        currentPlayer: { id: 1 },
        playerId: 1,
        isSpectator: false,
      });
      
      rerender();
      
      // After acquiring a card
      useGameStore.mockReturnValue({
        gameState: { players: [] },
        previousGameState: previousState,
        myPlayer: { id: 1, hand: [{ id: 1 }, { id: 2 }] },
        currentPlayer: { id: 1 },
        playerId: 1,
        isSpectator: false,
      });
      
      rerender();
      
      expect(soundManager.play).toHaveBeenCalledWith('acquireMerchant');
    });
  });

  describe('Claim Point Card Sound', () => {
    it('should play sound when I claim a golem', () => {
      const { rerender } = renderHook(() => useGameSounds());
      
      // Initial state
      const previousState = {
        players: [
          { id: 1, pointCards: [] }
        ]
      };
      
      useGameStore.mockReturnValue({
        gameState: { players: [] },
        previousGameState: previousState,
        myPlayer: { id: 1, pointCards: [] },
        currentPlayer: { id: 1 },
        playerId: 1,
        isSpectator: false,
      });
      
      rerender();
      
      // After claiming a golem
      useGameStore.mockReturnValue({
        gameState: { players: [] },
        previousGameState: previousState,
        myPlayer: { id: 1, pointCards: [{ id: 100 }] },
        currentPlayer: { id: 1 },
        playerId: 1,
        isSpectator: false,
      });
      
      rerender();
      
      expect(soundManager.play).toHaveBeenCalledWith('claimPointCard');
    });
  });

  describe('Rest Sound', () => {
    it('should play sound when I rest', () => {
      const { rerender } = renderHook(() => useGameSounds());
      
      // Initial state - I have played cards
      const previousState = {
        players: [
          { id: 1, playedCards: [{ id: 1 }, { id: 2 }], hand: [{ id: 3 }] }
        ]
      };
      
      useGameStore.mockReturnValue({
        gameState: { players: [] },
        previousGameState: previousState,
        myPlayer: { id: 1, playedCards: [{ id: 1 }, { id: 2 }], hand: [{ id: 3 }] },
        currentPlayer: { id: 1 },
        playerId: 1,
        isSpectator: false,
      });
      
      rerender();
      
      // After resting - played cards go to hand
      useGameStore.mockReturnValue({
        gameState: { players: [] },
        previousGameState: previousState,
        myPlayer: { id: 1, playedCards: [], hand: [{ id: 1 }, { id: 2 }, { id: 3 }] },
        currentPlayer: { id: 1 },
        playerId: 1,
        isSpectator: false,
      });
      
      rerender();
      
      expect(soundManager.play).toHaveBeenCalledWith('rest');
    });
  });

  describe('Mute Controls', () => {
    it('should expose mute control methods', () => {
      const { result } = renderHook(() => useGameSounds());
      
      expect(typeof result.current.toggleMute).toBe('function');
      expect(typeof result.current.setMuted).toBe('function');
      expect(typeof result.current.isMuted).toBe('function');
    });
  });
});
