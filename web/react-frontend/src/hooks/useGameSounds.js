import { useEffect, useRef } from 'react';
import useGameStore from '../store/gameStore';
import soundManager from '../utils/sounds';
import { createLogger } from '../utils/logger';

const logger = createLogger('GameSounds');

/**
 * Custom hook to manage game sounds
 * Listens to game state changes and plays appropriate sounds
 */
export default function useGameSounds() {
  const { 
    gameState, 
    previousGameState, 
    myPlayer, 
    currentPlayer,
    playerId,
    isSpectator 
  } = useGameStore();
  
  // Track if we've already played the "nearly end" sound
  const nearlyEndPlayed = useRef(false);
  const previousTurnPlayer = useRef(null);
  
  // Play "my turn" sound when it becomes the player's turn
  useEffect(() => {
    if (isSpectator || !currentPlayer || !playerId) return;
    
    const isMyTurn = currentPlayer.id === playerId;
    const wasPreviousTurn = previousTurnPlayer.current === playerId;
    
    // Play sound only when transitioning TO my turn (not already my turn)
    if (isMyTurn && !wasPreviousTurn) {
      logger.info('Playing my turn sound');
      soundManager.play('myTurn');
    }
    
    // Update previous turn player
    previousTurnPlayer.current = currentPlayer.id;
  }, [currentPlayer, playerId, isSpectator]);
  
  // Play "nearly end" sound when someone reaches 4 golems
  useEffect(() => {
    if (!gameState || nearlyEndPlayed.current) return;
    
    const players = gameState.players || [];
    const someoneHas4Golems = players.some(player => 
      (player.pointCards?.length || 0) >= 4
    );
    
    if (someoneHas4Golems) {
      logger.info('Someone has 4 golems - playing nearly end sound');
      soundManager.play('nearlyEnd', true);
      nearlyEndPlayed.current = true;
    }
  }, [gameState]);
  
  // Play "game over" sound when game ends
  useEffect(() => {
    if (!gameState) return;
    
    if (gameState.gameOver) {
      logger.info('Game over - playing game over sound');
      soundManager.play('gameOver', true);
    }
  }, [gameState?.gameOver]);
  
  // Detect when current player plays a card
  useEffect(() => {
    if (isSpectator || !myPlayer || !previousGameState?.players) return;
    
    const prevMyPlayer = previousGameState.players?.find(p => p.id === playerId);
    if (!prevMyPlayer) return;
    
    const prevPlayedCount = prevMyPlayer.playedCards?.length || 0;
    const currentPlayedCount = myPlayer.playedCards?.length || 0;
    
    // If I played a new card
    if (currentPlayedCount > prevPlayedCount) {
      logger.info(`🃏 Playing card sound (${prevPlayedCount} -> ${currentPlayedCount})`);
      soundManager.play('playCard');
    }
  }, [myPlayer?.playedCards?.length, isSpectator, playerId, previousGameState]);
  
  // Detect when current player acquires a merchant card
  useEffect(() => {
    if (isSpectator || !myPlayer || !previousGameState?.players) return;
    
    const prevMyPlayer = previousGameState.players?.find(p => p.id === playerId);
    if (!prevMyPlayer) return;
    
    const prevHandCount = prevMyPlayer.hand?.length || 0;
    const currentHandCount = myPlayer.hand?.length || 0;
    
    // If hand increased (acquired a card)
    if (currentHandCount > prevHandCount) {
      logger.info(`🛒 Playing acquire merchant sound (${prevHandCount} -> ${currentHandCount})`);
      soundManager.play('acquireMerchant');
    }
  }, [myPlayer?.hand?.length, isSpectator, playerId, previousGameState]);
  
  // Detect when current player claims a point card (golem)
  useEffect(() => {
    if (isSpectator || !myPlayer || !previousGameState?.players) return;
    
    const prevMyPlayer = previousGameState.players?.find(p => p.id === playerId);
    if (!prevMyPlayer) return;
    
    const prevPointCardsCount = prevMyPlayer.pointCards?.length || 0;
    const currentPointCardsCount = myPlayer.pointCards?.length || 0;
    
    // If point cards increased (claimed a golem)
    if (currentPointCardsCount > prevPointCardsCount) {
      logger.info(`🏆 Playing claim point card sound (${prevPointCardsCount} -> ${currentPointCardsCount})`);
      soundManager.play('claimPointCard');
    }
  }, [myPlayer?.pointCards?.length, isSpectator, playerId, previousGameState]);
  
  // Detect when current player rests
  useEffect(() => {
    if (isSpectator || !myPlayer || !previousGameState?.players) return;
    
    const prevMyPlayer = previousGameState.players?.find(p => p.id === playerId);
    if (!prevMyPlayer) return;
    
    const prevPlayedCount = prevMyPlayer.playedCards?.length || 0;
    const currentPlayedCount = myPlayer.playedCards?.length || 0;
    const prevHandCount = prevMyPlayer.hand?.length || 0;
    const currentHandCount = myPlayer.hand?.length || 0;
    
    // If rested: played cards went to 0 and hand increased
    if (prevPlayedCount > 0 && currentPlayedCount === 0 && currentHandCount > prevHandCount) {
      logger.info(`😴 Playing rest sound (played: ${prevPlayedCount} -> ${currentPlayedCount}, hand: ${prevHandCount} -> ${currentHandCount})`);
      soundManager.play('rest');
    }
  }, [myPlayer?.playedCards?.length, myPlayer?.hand?.length, isSpectator, playerId, previousGameState]);
  
  return {
    toggleMute: () => soundManager.toggleMute(),
    setMuted: (muted) => soundManager.setMuted(muted),
    isMuted: () => soundManager.getMuted(),
  };
}
