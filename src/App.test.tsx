import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'

describe('App Component', () => {
    it('renders search input', () => {
        render(<App />)
        const searchInput = screen.getByPlaceholderText(/Search clipboard.../i)
        expect(searchInput).toBeInTheDocument()
    })

    it('renders empty history message when no items', () => {
        render(<App />)
        expect(screen.getByText(/History is empty/i)).toBeInTheDocument()
    })

    it('requests initial history on mount', async () => {
        vi.useFakeTimers()
        render(<App />)
        vi.advanceTimersByTime(1000)
        expect(window.ipcRenderer.send).toHaveBeenCalledWith('get-history')
        vi.useRealTimers()
    })
})

describe('App Component - History rendering', () => {
    let clipboardHistoryCallback: any

    beforeEach(() => {
        vi.clearAllMocks()
        // Capture the callback functionality
        // @ts-ignore
        window.ipcRenderer.on.mockImplementation((channel, callback) => {
            if (channel === 'clipboard-history') {
                clipboardHistoryCallback = callback
            }
            return vi.fn()
        })
    })

    it('renders text history item correctly', async () => {
        render(<App />)
        const textItem = { id: 1, type: 'text', text: 'Hello World', timestamp: new Date().toISOString() }

        // Simulate receiving history
        expect(clipboardHistoryCallback).toBeDefined()
        await act(async () => {
            clipboardHistoryCallback({}, [textItem])
        })

        expect(screen.getByText('Hello World')).toBeInTheDocument()
    })

    it('renders image item correctly with "IMAGE" badge', async () => {
        render(<App />)
        const imageItem = {
            id: 123,
            type: 'image',
            image: 'data:image/png;base64,fakeimage',
            timestamp: new Date().toISOString()
        }

        expect(clipboardHistoryCallback).toBeDefined()
        await act(async () => {
            clipboardHistoryCallback({}, [imageItem])
        })

        expect(screen.getByAltText('Clipboard')).toBeInTheDocument()
        expect(screen.getByText('IMAGE')).toBeInTheDocument()
    })

    it('copies text item when clicked', async () => {
        const user = userEvent.setup()
        render(<App />)
        const textItem = { id: 1, type: 'text', text: 'Copy me', timestamp: new Date().toISOString() }

        await act(async () => {
            clipboardHistoryCallback({}, [textItem])
        })

        const itemElement = screen.getByText('Copy me')
        await user.click(itemElement)

        expect(window.ipcRenderer.send).toHaveBeenCalledWith('copy-item', textItem)
    })

    it('copies image item when clicked', async () => {
        const user = userEvent.setup()
        render(<App />)
        const imageItem = {
            id: 123,
            type: 'image',
            image: 'data:image/png;base64,fakeimage',
            timestamp: new Date().toISOString()
        }

        await act(async () => {
            clipboardHistoryCallback({}, [imageItem])
        })

        const itemImage = screen.getByAltText('Clipboard')
        // We click the container usually, but clicking the image inside should work as it propagates
        await user.click(itemImage)

        expect(window.ipcRenderer.send).toHaveBeenCalledWith('copy-item', imageItem)
    })

    it('filters history items correctly', async () => {
        const user = userEvent.setup()
        render(<App />)
        const textItem = { id: 1, type: 'text', text: 'Apple' as const, timestamp: new Date().toISOString() }
        const imageItem = { id: 2, type: 'image', image: 'data:..', timestamp: new Date().toISOString() }

        await act(async () => {
            clipboardHistoryCallback({}, [textItem, imageItem])
        })

        const searchInput = screen.getByPlaceholderText(/Search clipboard.../i)

        // Search for text
        await user.type(searchInput, 'App')
        expect(searchInput).toHaveValue('App')
        await waitFor(() => {
            expect(screen.getByText('Apple')).toBeInTheDocument()
            expect(screen.queryByText('IMAGE')).not.toBeInTheDocument()
        })

        // Clear search
        await user.clear(searchInput)
        expect(searchInput).toHaveValue('')
        await waitFor(() => {
            expect(screen.getByText('Apple')).toBeInTheDocument()
            expect(screen.getByText('IMAGE')).toBeInTheDocument()
        })

        // Search for "image"
        await user.type(searchInput, 'image')
        expect(searchInput).toHaveValue('image')
        await waitFor(() => {
            expect(screen.queryByText('Apple')).not.toBeInTheDocument()
            expect(screen.getByText('IMAGE')).toBeInTheDocument()
        })
    })
})
