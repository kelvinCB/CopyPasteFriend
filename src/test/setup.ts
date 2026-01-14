import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Electron's ipcRenderer which is exposed in the main world
Object.defineProperty(window, 'ipcRenderer', {
    value: {
        send: vi.fn(),
        on: vi.fn(() => vi.fn()),
        removeListener: vi.fn(),
    },
})
