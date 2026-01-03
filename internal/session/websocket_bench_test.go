package session

import (
	"encoding/json"
	"sync"
	"testing"
	"time"

	"golem_century/internal/logger"
)

// BenchmarkBroadcastCurrent benchmarks the current broadcast implementation
func BenchmarkBroadcastCurrent(b *testing.B) {
	log := logger.NewNopLogger()
	session := NewGameSession("bench-session", 4, 60, nil, nil, log)

	// Create mock players with buffered channels
	players := make([]*PlayerInfo, 100)
	for i := 0; i < 100; i++ {
		players[i] = &PlayerInfo{
			ClientID:  "client-" + string(rune(i)),
			WriteChan: make(chan []byte, 100),
		}
		session.connectedPlayers[players[i].ClientID] = players[i]

		// Start goroutine to drain the channel
		go func(p *PlayerInfo) {
			for range p.WriteChan {
				// Discard messages
			}
		}(players[i])
	}

	testMsg := map[string]interface{}{
		"type":    "game_state",
		"message": "test broadcast message",
		"data":    make([]byte, 1024), // 1KB payload
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		session.broadcast(testMsg)
	}

	// Cleanup
	for _, p := range players {
		close(p.WriteChan)
	}
}

// BenchmarkBroadcastSmallPayload benchmarks with small messages
func BenchmarkBroadcastSmallPayload(b *testing.B) {
	log := logger.NewNopLogger()
	session := NewGameSession("bench-session-small", 4, 60, nil, nil, log)

	players := make([]*PlayerInfo, 10)
	for i := 0; i < 10; i++ {
		players[i] = &PlayerInfo{
			ClientID:  "client-" + string(rune(i)),
			WriteChan: make(chan []byte, 100),
		}
		session.connectedPlayers[players[i].ClientID] = players[i]

		go func(p *PlayerInfo) {
			for range p.WriteChan {
			}
		}(players[i])
	}

	testMsg := map[string]interface{}{
		"type":    "action",
		"message": "player moved",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		session.broadcast(testMsg)
	}

	for _, p := range players {
		close(p.WriteChan)
	}
}

// BenchmarkDirectChannelWrite benchmarks direct channel writes
func BenchmarkDirectChannelWrite(b *testing.B) {
	ch := make(chan []byte, 100)
	go func() {
		for range ch {
		}
	}()

	data, _ := json.Marshal(map[string]string{"test": "data"})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ch <- data
	}

	close(ch)
}

// BenchmarkJSONMarshal benchmarks JSON marshaling overhead
func BenchmarkJSONMarshal(b *testing.B) {
	msg := map[string]interface{}{
		"type":     "game_state",
		"playerID": 1,
		"data":     map[string]int{"score": 100, "turn": 5},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		json.Marshal(msg)
	}
}

// BenchmarkPingPongOverhead benchmarks the ping/pong mechanism overhead
func BenchmarkPingPongOverhead(b *testing.B) {
	log := logger.NewNopLogger()
	session := NewGameSession("bench-ping", 2, 60, nil, nil, log)
	session.pingInterval = 1 * time.Millisecond // Very frequent for testing

	player := &PlayerInfo{
		ClientID:  "bench-client",
		WriteChan: make(chan []byte, 100),
		Conn:      nil, // Mock connection
	}

	// Drain channel
	go func() {
		for range player.WriteChan {
		}
	}()

	b.ResetTimer()

	// Simulate many ping sends
	ticker := time.NewTicker(session.pingInterval)
	defer ticker.Stop()

	count := 0
	for count < b.N {
		select {
		case <-ticker.C:
			// Simulate ping send overhead (without actual WebSocket write)
			count++
		}
	}

	close(player.WriteChan)
}

// BenchmarkConcurrentBroadcasts benchmarks concurrent broadcast calls
func BenchmarkConcurrentBroadcasts(b *testing.B) {
	log := logger.NewNopLogger()
	session := NewGameSession("bench-concurrent", 4, 60, nil, nil, log)

	players := make([]*PlayerInfo, 50)
	for i := 0; i < 50; i++ {
		players[i] = &PlayerInfo{
			ClientID:  "client-" + string(rune(i)),
			WriteChan: make(chan []byte, 100),
		}
		session.connectedPlayers[players[i].ClientID] = players[i]

		go func(p *PlayerInfo) {
			for range p.WriteChan {
			}
		}(players[i])
	}

	testMsg := map[string]interface{}{
		"type": "update",
		"data": "concurrent test",
	}

	b.ResetTimer()

	var wg sync.WaitGroup
	workers := 10
	iterations := b.N / workers

	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < iterations; i++ {
				session.broadcast(testMsg)
			}
		}()
	}

	wg.Wait()

	for _, p := range players {
		close(p.WriteChan)
	}
}

// BenchmarkWriteChannelSaturation benchmarks channel saturation scenarios
func BenchmarkWriteChannelSaturation(b *testing.B) {
	ch := make(chan []byte, 10) // Small buffer

	// Slow consumer
	go func() {
		for range ch {
			time.Sleep(10 * time.Microsecond) // Simulate slow write
		}
	}()

	data := []byte("test message")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		select {
		case ch <- data:
			// Success
		default:
			// Channel full - skip
		}
	}

	close(ch)
}

// BenchmarkMutexContention benchmarks mutex contention in broadcast
func BenchmarkMutexContention(b *testing.B) {
	log := logger.NewNopLogger()
	session := NewGameSession("bench-mutex", 4, 60, nil, nil, log)

	// Add players
	for i := 0; i < 20; i++ {
		player := &PlayerInfo{
			ClientID:  "client-" + string(rune(i)),
			WriteChan: make(chan []byte, 100),
		}
		session.connectedPlayers[player.ClientID] = player

		go func(p *PlayerInfo) {
			for range p.WriteChan {
			}
		}(player)
	}

	msg := map[string]interface{}{"type": "test"}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			session.mu.RLock()
			// Simulate read operation
			_ = len(session.connectedPlayers)
			session.mu.RUnlock()

			// Broadcast requires read lock
			session.broadcast(msg)
		}
	})

	for _, p := range session.connectedPlayers {
		close(p.WriteChan)
	}
}
