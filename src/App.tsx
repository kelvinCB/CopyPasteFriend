import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Trash2, Clock, Copy } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface HistoryItem {
    id: number
    text: string
    timestamp: string
}

const App: React.FC = () => {
    const [history, setHistory] = useState<HistoryItem[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const listRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        console.log('Renderer: Initializing IPC listeners...')

        // Initial fetch with a small delay to ensure main process is ready to receive
        const timer = setTimeout(() => {
            console.log('Renderer: Requesting history...')
            window.ipcRenderer.send('get-history')
        }, 500)

        const off = window.ipcRenderer.on('clipboard-changed', (_event: any, newHistory: HistoryItem[]) => {
            console.log('Renderer: Received clipboard-changed', newHistory.length)
            setHistory(newHistory)
        })

        const offHistory = window.ipcRenderer.on('clipboard-history', (_event: any, data: HistoryItem[]) => {
            console.log('Renderer: Received clipboard-history', data.length)
            setHistory(data)
        })

        return () => {
            clearTimeout(timer)
            off()
            offHistory()
        }
    }, [])

    const filteredHistory = history.filter(item =>
        item.text.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleCopy = (text: string) => {
        window.ipcRenderer.send('copy-text', text)
    }

    const handleClear = () => {
        window.ipcRenderer.send('clear-history')
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                setSelectedIndex(prev => Math.min(prev + 1, filteredHistory.length - 1))
            } else if (e.key === 'ArrowUp') {
                setSelectedIndex(prev => Math.max(prev - 1, 0))
            } else if (e.key === 'Enter') {
                if (filteredHistory[selectedIndex]) {
                    handleCopy(filteredHistory[selectedIndex].text)
                }
            } else if (e.key === 'Escape') {
                // Window blur will handle hiding, but we can be explicit
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [filteredHistory, selectedIndex])

    return (
        <div className="h-screen w-screen flex flex-col glass rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {/* Header / Search */}
            <div className="p-4 drag-region pb-2">
                <div className="relative no-drag">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        type="text"
                        placeholder="Search clipboard..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder:text-white/20 transition-all"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setSelectedIndex(0)
                        }}
                        autoFocus
                    />
                </div>
            </div>

            {/* History List */}
            <div
                ref={listRef}
                className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1"
            >
                <AnimatePresence initial={false}>
                    {filteredHistory.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-full text-white/20 space-y-2 py-10"
                        >
                            <Clock className="w-8 h-8 opacity-50" />
                            <p className="text-sm font-medium">History is empty</p>
                        </motion.div>
                    ) : (
                        filteredHistory.map((item, index) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={cn(
                                    "p-3 rounded-xl transition-all cursor-pointer group flex flex-col space-y-1 relative no-drag",
                                    selectedIndex === index ? "bg-primary/20 border border-primary/20 shadow-lg" : "hover:bg-white/5 border border-transparent"
                                )}
                                onClick={() => handleCopy(item.text)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="text-sm text-white/90 line-clamp-3 break-all font-medium pr-8">
                                        {item.text}
                                    </div>
                                    <Copy className={cn(
                                        "w-3.5 h-3.5 transition-opacity",
                                        selectedIndex === index ? "opacity-60" : "opacity-0 group-hover:opacity-40"
                                    )} />
                                </div>
                                <div className="text-[10px] text-white/30 flex items-center space-x-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/10 flex justify-between items-center text-[10px] text-white/30 font-medium">
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">↵</kbd>
                        <span>Paste</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">↑↓</kbd>
                        <span>Navigate</span>
                    </div>
                </div>
                <button
                    onClick={handleClear}
                    className="hover:text-red-400 transition-colors flex items-center space-x-1 no-drag"
                >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                </button>
            </div>
        </div>
    )
}

export default App
