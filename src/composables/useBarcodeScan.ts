import { ref, onMounted, onUnmounted } from 'vue'

interface UseBarcodeScanOptions {
  /** Minimum number of characters to consider a valid barcode scan */
  minLength?: number
  /** Maximum time (ms) between keystrokes to consider them part of the same scan */
  maxIntervalMs?: number
  /** Characters that signal end of scan (e.g., Enter key) */
  endKeys?: string[]
}

export function useBarcodeScan(options?: UseBarcodeScanOptions) {
  const {
    minLength = 4,
    maxIntervalMs = 50,
    endKeys = ['Enter']
  } = options ?? {}

  const scannedValue = ref('')
  let buffer = ''
  let lastKeyTime = 0
  let scanCallback: ((value: string) => void) | null = null

  function onScan(callback: (value: string) => void): void {
    scanCallback = callback
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const now = Date.now()
    const timeSinceLastKey = now - lastKeyTime
    lastKeyTime = now

    // If too much time has elapsed, reset the buffer
    if (timeSinceLastKey > maxIntervalMs && buffer.length > 0) {
      buffer = ''
    }

    // Check if this is an end-of-scan key
    if (endKeys.includes(event.key)) {
      if (buffer.length >= minLength) {
        scannedValue.value = buffer

        if (scanCallback) {
          scanCallback(buffer)
        }
      }
      buffer = ''
      return
    }

    // Only accumulate printable single characters
    if (event.key.length === 1) {
      buffer += event.key
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    scannedValue,
    onScan
  }
}
