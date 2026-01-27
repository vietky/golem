/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { 
  ChatProvider, 
  useChatContext, 
  ChatOverlay, 
  ChatInput, 
  ChatDialog, 
  ChatToggleButton 
} from '../Chat'

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn()

// Mock dependencies
vi.mock('../../store/gameStore', () => ({
  default: vi.fn(() => ({
    setChatMessageCallback: null,
    sendChatMessage: null,
  })),
}))

vi.mock('../../hooks/useOrientation', () => ({
  default: () => ({
    isMobile: false,
    isPortrait: false,
    isTablet: false,
  }),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}))

describe('Chat Components', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('ChatProvider', () => {
    it('provides chat context to children', () => {
      const TestComponent = () => {
        const context = useChatContext()
        return <div data-testid="context-check">{context ? 'has context' : 'no context'}</div>
      }

      render(
        <ChatProvider playerName="TestPlayer">
          <TestComponent />
        </ChatProvider>
      )

      expect(screen.getByTestId('context-check').textContent).toBe('has context')
    })

    it('throws error when useChatContext is used outside provider', () => {
      const TestComponent = () => {
        const context = useChatContext()
        return <div>{context}</div>
      }

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => render(<TestComponent />)).toThrow('useChatContext must be used within ChatProvider')
      
      consoleSpy.mockRestore()
    })

    it('provides all expected context values', () => {
      const TestComponent = () => {
        const context = useChatContext()
        const contextKeys = Object.keys(context).sort().join(',')
        return <div data-testid="context-keys">{contextKeys}</div>
      }

      render(
        <ChatProvider playerName="TestPlayer">
          <TestComponent />
        </ChatProvider>
      )

      const keys = screen.getByTestId('context-keys').textContent.split(',')
      expect(keys).toContain('chatMessages')
      expect(keys).toContain('sendChatMessage')
      expect(keys).toContain('isDialogOpen')
    })
  })

  describe('ChatInput', () => {
    it('renders input field', () => {
      render(
        <ChatProvider playerName="TestPlayer">
          <ChatInput />
        </ChatProvider>
      )

      expect(screen.getByPlaceholderText(/type a message/i)).toBeTruthy()
    })

    it('renders send button', () => {
      render(
        <ChatProvider playerName="TestPlayer">
          <ChatInput />
        </ChatProvider>
      )

      // Find button with "Send" text
      const buttons = screen.getAllByRole('button')
      const sendButton = buttons.find(btn => btn.textContent.includes('Send'))
      expect(sendButton).toBeTruthy()
    })

    it('updates input value on change', () => {
      render(
        <ChatProvider playerName="TestPlayer">
          <ChatInput />
        </ChatProvider>
      )

      const input = screen.getByPlaceholderText(/type a message/i)
      fireEvent.change(input, { target: { value: 'Hello world' } })

      expect(input.value).toBe('Hello world')
    })

    it('clears input after sending message', () => {
      render(
        <ChatProvider playerName="TestPlayer">
          <ChatInput />
        </ChatProvider>
      )

      const input = screen.getByPlaceholderText(/type a message/i)
      fireEvent.change(input, { target: { value: 'Test message' } })
      
      // Find and click send button
      const buttons = screen.getAllByRole('button')
      const sendButton = buttons.find(btn => btn.textContent.includes('Send'))
      fireEvent.click(sendButton)

      expect(input.value).toBe('')
    })

    it('sends message on Enter key press', () => {
      render(
        <ChatProvider playerName="TestPlayer">
          <ChatInput />
        </ChatProvider>
      )

      const input = screen.getByPlaceholderText(/type a message/i)
      fireEvent.change(input, { target: { value: 'Enter message' } })
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

      expect(input.value).toBe('')
    })

    it('does not send on Shift+Enter', () => {
      render(
        <ChatProvider playerName="TestPlayer">
          <ChatInput />
        </ChatProvider>
      )

      const input = screen.getByPlaceholderText(/type a message/i)
      fireEvent.change(input, { target: { value: 'Multiline message' } })
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true })

      expect(input.value).toBe('Multiline message')
    })

    it('disables send button when input is empty', () => {
      render(
        <ChatProvider playerName="TestPlayer">
          <ChatInput />
        </ChatProvider>
      )

      const buttons = screen.getAllByRole('button')
      const sendButton = buttons.find(btn => btn.textContent.includes('Send'))
      expect(sendButton.disabled).toBe(true)
    })

    it('renders compact mode correctly', () => {
      render(
        <ChatProvider playerName="TestPlayer">
          <ChatInput compact />
        </ChatProvider>
      )

      expect(screen.getByPlaceholderText(/chat\.\.\./i)).toBeTruthy()
    })
  })

  describe('ChatToggleButton', () => {
    it('renders toggle button with chat emoji', () => {
      render(
        <ChatProvider playerName="TestPlayer">
          <ChatToggleButton />
        </ChatProvider>
      )

      const buttons = screen.getAllByRole('button')
      const toggleButton = buttons.find(btn => btn.textContent.includes('💬'))
      expect(toggleButton).toBeTruthy()
    })
  })

  describe('ChatDialog', () => {
    it('renders when open and shows close button', () => {
      const TestComponent = () => {
        const { setIsDialogOpen } = useChatContext()
        React.useEffect(() => {
          setIsDialogOpen(true)
        }, [setIsDialogOpen])
        return <ChatDialog />
      }

      render(
        <ChatProvider playerName="TestPlayer">
          <TestComponent />
        </ChatProvider>
      )

      // Dialog should have close button (uses × not ✕)
      const buttons = screen.getAllByRole('button')
      const closeButton = buttons.find(btn => btn.textContent.includes('×'))
      expect(closeButton).toBeTruthy()
    })
  })

  describe('ChatOverlay', () => {
    it('renders without errors', () => {
      render(
        <ChatProvider playerName="TestPlayer">
          <ChatOverlay />
        </ChatProvider>
      )
      
      // Just verify it renders without throwing
      expect(true).toBe(true)
    })
  })

  describe('Message Formatting', () => {
    it('initially has no messages', () => {
      const TestComponent = () => {
        const { chatMessages } = useChatContext()
        return <div data-testid="messages">{chatMessages.length}</div>
      }

      render(
        <ChatProvider playerName="TestPlayer">
          <TestComponent />
        </ChatProvider>
      )

      expect(screen.getByTestId('messages').textContent).toBe('0')
    })
  })
})
