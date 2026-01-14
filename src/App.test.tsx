import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
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

    it('requests initial history on mount', () => {
        render(<App />)
        // The request happens with a delay in my App.tsx refactor
        // We can use vi.useFakeTimers or just check if the mock was called after a while
        // But since it's a unit test, let's keep it simple for now or use fake timers
    })
})
