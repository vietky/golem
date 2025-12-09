import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import TradeModal from '../TradeModal'

describe('TradeModal', () => {
  test('shows error when player has insufficient resources and calls onCancel', () => {
    const card = {
      name: 'Test Trade',
      input: { yellow: 2 },
      output: { green: 1 }
    }

    const playerResources = { yellow: 1 }
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(<TradeModal card={card} playerResources={playerResources} onConfirm={onConfirm} onCancel={onCancel} />)

    // Error should be visible because player cannot afford even a single trade
    // The component may show either 'Not enough resources for this trade' or
    // 'Multiplier must be at least 1' depending on validation order.
    const errEl = screen.getByText(/Multiplier must be at least 1|Not enough resources for this trade/i)
    expect(errEl).toBeTruthy()

    // Cancel should call onCancel
    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtn)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('calls onConfirm when valid multiplier and confirm clicked', () => {
    const card = {
      name: 'Valid Trade',
      input: { yellow: 1 },
      output: { green: 1 }
    }
    const playerResources = { yellow: 2 }
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(<TradeModal card={card} playerResources={playerResources} onConfirm={onConfirm} onCancel={onCancel} />)

    // initially multiplier should be 1 and Confirm should be enabled
    const confirmBtns = screen.getAllByRole('button', { name: /confirm trade/i })
    // pick the first non-disabled Confirm button (AnimatePresence may render duplicates)
    const confirmBtn = confirmBtns.find(b => !b.disabled) || confirmBtns[0]
    expect(confirmBtn).toBeTruthy()
    expect(confirmBtn.disabled).toBe(false)

    fireEvent.click(confirmBtn)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
