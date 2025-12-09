// Toast store - simple global state
let toastListener = null
let toastId = 0

export const showToast = (message, type = 'error') => {
  console.log('[Toast] showToast called:', message, 'listener:', !!toastListener)
  if (toastListener) {
    toastListener({ id: ++toastId, message, type })
  } else {
    // Fallback: use alert if Toast not mounted
    console.warn('[Toast] No listener, using alert fallback')
    alert(message)
  }
}

export const setToastListener = (listener) => {
  console.log('[Toast] Setting listener')
  toastListener = listener
}

export const clearToastListener = () => {
  console.log('[Toast] Clearing listener')
  toastListener = null
}

