import React from 'react';
import useGameStore from '../store/gameStore';
import soundManager from '../utils/sounds';

export default function SoundToggleButton() {
  const { soundsMuted, toggleSoundsMuted } = useGameStore();

  const handleToggle = () => {
    const newMutedState = toggleSoundsMuted();
    soundManager.setMuted(newMutedState);
  };

  return (
    <button
      onClick={handleToggle}
      className="fixed top-4 right-20 z-50 p-2 bg-gray-800/80 hover:bg-gray-700/90 text-white rounded-lg shadow-lg transition-all duration-200 backdrop-blur-sm border border-gray-600/50"
      title={soundsMuted ? 'Unmute sounds' : 'Mute sounds'}
      aria-label={soundsMuted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {soundsMuted ? (
        // Muted icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
      ) : (
        // Unmuted icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      )}
    </button>
  );
}
