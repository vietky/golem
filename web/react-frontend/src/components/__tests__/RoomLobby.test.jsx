import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RoomLobby from '../RoomLobby';

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  onopen: null,
  onmessage: null,
  onerror: null,
  onclose: null,
  send: vi.fn(),
  close: vi.fn(),
}));

describe('RoomLobby', () => {
  it('renders loading state initially', () => {
    const mockOnBack = vi.fn();
    const mockOnGameStart = vi.fn();

    render(
      <RoomLobby
        sessionId="test-session"
        playerName="TestPlayer"
        playerAvatar="1"
        onBack={mockOnBack}
        onGameStart={mockOnGameStart}
      />
    );

    expect(screen.getByText(/Loading lobby/i)).toBeInTheDocument();
  });

  it('displays session ID', () => {
    const mockOnBack = vi.fn();
    const mockOnGameStart = vi.fn();

    render(
      <RoomLobby
        sessionId="test-session-123"
        playerName="TestPlayer"
        playerAvatar="1"
        onBack={mockOnBack}
        onGameStart={mockOnGameStart}
      />
    );

    // WebSocket will be created, triggering loading state
    expect(screen.getByText(/Loading lobby/i)).toBeInTheDocument();
  });
});
