// Toast store - simple global state
import { createLogger } from './logger'

const logger = createLogger('Toast');

let toastListener = null
let toastId = 0

export const showToast = (message, type = 'error') => {
  logger.debug('showToast called:', message, 'listener:', !!toastListener)
  if (toastListener) {
    toastListener({ id: ++toastId, message, type })
  } else {
    // Fallback: use alert if Toast not mounted
    logger.warn('No listener, using alert fallback')
    alert(message)
  }
}

export const setToastListener = (listener) => {
  logger.debug('Setting listener')
  toastListener = listener
}

export const clearToastListener = () => {
  logger.debug('Clearing listener')
  toastListener = null
}

