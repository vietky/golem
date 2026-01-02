/**
 * Sound System Test
 * 
 * This file contains tests to verify the sound system works correctly:
 * 1. Sounds load properly
 * 2. Mute/unmute functionality works
 * 3. No overlapping sounds (unless explicitly allowed)
 * 4. LocalStorage persistence
 */

import soundManager from '../utils/sounds';

// Test 1: Check if all sounds are loaded
export function testSoundsLoaded() {
  console.log('Test 1: Checking if all sounds are loaded...');
  
  const expectedSounds = [
    'playCard',
    'acquireMerchant',
    'claimPointCard',
    'rest',
    'gameOver',
    'myTurn',
    'nearlyEnd'
  ];
  
  const loadedSounds = Object.keys(soundManager.sounds);
  const allLoaded = expectedSounds.every(sound => loadedSounds.includes(sound));
  
  if (allLoaded) {
    console.log('✅ Test 1 PASSED: All sounds loaded successfully');
    return true;
  } else {
    console.error('❌ Test 1 FAILED: Some sounds are missing');
    console.error('Expected:', expectedSounds);
    console.error('Loaded:', loadedSounds);
    return false;
  }
}

// Test 2: Check mute/unmute functionality
export function testMuteUnmute() {
  console.log('\nTest 2: Testing mute/unmute functionality...');
  
  // Get initial state
  const initialMuted = soundManager.getMuted();
  console.log('Initial mute state:', initialMuted);
  
  // Toggle mute
  const afterToggle1 = soundManager.toggleMute();
  console.log('After first toggle:', afterToggle1);
  
  // Toggle again
  const afterToggle2 = soundManager.toggleMute();
  console.log('After second toggle:', afterToggle2);
  
  // Check if it returned to initial state
  if (afterToggle2 === initialMuted) {
    console.log('✅ Test 2 PASSED: Mute/unmute works correctly');
    return true;
  } else {
    console.error('❌ Test 2 FAILED: Mute state did not return to initial value');
    return false;
  }
}

// Test 3: Check localStorage persistence
export function testLocalStoragePersistence() {
  console.log('\nTest 3: Testing localStorage persistence...');
  
  // Set muted to true
  soundManager.setMuted(true);
  const storedValue1 = localStorage.getItem('gameSoundsMuted');
  
  if (storedValue1 !== 'true') {
    console.error('❌ Test 3 FAILED: localStorage not set correctly when muted');
    return false;
  }
  
  // Set muted to false
  soundManager.setMuted(false);
  const storedValue2 = localStorage.getItem('gameSoundsMuted');
  
  if (storedValue2 !== 'false') {
    console.error('❌ Test 3 FAILED: localStorage not set correctly when unmuted');
    return false;
  }
  
  console.log('✅ Test 3 PASSED: localStorage persistence works correctly');
  return true;
}

// Test 4: Play each sound (manual verification)
export function testPlaySounds() {
  console.log('\nTest 4: Playing each sound (listen for audio)...');
  
  const sounds = [
    { name: 'playCard', delay: 0 },
    { name: 'acquireMerchant', delay: 1000 },
    { name: 'claimPointCard', delay: 2000 },
    { name: 'rest', delay: 3000 },
    { name: 'myTurn', delay: 4000 },
    { name: 'nearlyEnd', delay: 5000 },
    { name: 'gameOver', delay: 6000 }
  ];
  
  // Ensure sounds are unmuted
  soundManager.setMuted(false);
  
  sounds.forEach(({ name, delay }) => {
    setTimeout(() => {
      console.log(`Playing ${name}...`);
      soundManager.play(name);
    }, delay);
  });
  
  console.log('⏳ Test 4: Sounds will play over the next 7 seconds');
  console.log('   Listen to verify each sound plays correctly');
  
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('✅ Test 4 COMPLETED: All sounds played (verify manually)');
      resolve(true);
    }, 8000);
  });
}

// Test 5: Overlap prevention
export function testOverlapPrevention() {
  console.log('\nTest 5: Testing overlap prevention...');
  
  soundManager.setMuted(false);
  
  // Try to play the same sound multiple times rapidly
  soundManager.play('playCard');
  soundManager.play('playCard');
  soundManager.play('playCard');
  
  const playingCount = soundManager.currentlyPlaying.size;
  
  setTimeout(() => {
    if (playingCount <= 1) {
      console.log('✅ Test 5 PASSED: Overlap prevention works (only 1 instance playing)');
      return true;
    } else {
      console.error('❌ Test 5 FAILED: Multiple instances of the same sound are playing');
      return false;
    }
  }, 100);
}

// Run all tests
export async function runAllTests() {
  console.log('='.repeat(60));
  console.log('SOUND SYSTEM TEST SUITE');
  console.log('='.repeat(60));
  
  const results = {
    test1: testSoundsLoaded(),
    test2: testMuteUnmute(),
    test3: testLocalStoragePersistence(),
    test5: testOverlapPrevention(),
  };
  
  // Test 4 is async
  results.test4 = await testPlaySounds();
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.keys(results).length;
  
  console.log(`Tests passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('✅ ALL TESTS PASSED!');
  } else {
    console.log('⚠️ Some tests failed. Please review the output above.');
  }
  
  console.log('='.repeat(60));
}

// Export for use in console
if (typeof window !== 'undefined') {
  window.soundSystemTests = {
    runAllTests,
    testSoundsLoaded,
    testMuteUnmute,
    testLocalStoragePersistence,
    testPlaySounds,
    testOverlapPrevention,
  };
  
  console.log('Sound system tests loaded. Run `soundSystemTests.runAllTests()` in console to test.');
}
