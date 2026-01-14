import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Trash2, Clock, Copy, Palette } from 'lucide-react'
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

const THEME_COLORS = [
    { name: 'Default', value: '#60a5fa' }, // blue-400
    { name: 'Purple', value: '#a78bfa' }, // purple-400
    { name: 'Rose', value: '#fb7185' },   // rose-400
    { name: 'Emerald', value: '#34d399' }, // emerald-400
    { name: 'Amber', value: '#fbbf24' },   // amber-400
    { name: 'Sky', value: '#38bdf8' },     // sky-400
]

const App: React.FC = () => {
    const [history, setHistory] = useState<HistoryItem[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [primaryColor, setPrimaryColor] = useState('#60a5fa')
    const [showColorPicker, setShowColorPicker] = useState(false)
    const listRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Initial fetch
        const timer = setTimeout(async () => {
            window.ipcRenderer.send('get-history')
            try {
                const savedColor = await window.ipcRenderer.invoke('get-theme')
                if (savedColor) setPrimaryColor(savedColor)
            } catch (e) {
                console.error('Failed to load theme:', e)
            }
        }, 500)

        const off = window.ipcRenderer.on('clipboard-changed', (_event: any, newHistory: HistoryItem[]) => {
            setHistory(newHistory)
        })

        const offHistory = window.ipcRenderer.on('clipboard-history', (_event: any, data: HistoryItem[]) => {
            setHistory(data)
        })

        return () => {
            clearTimeout(timer)
            off()
            offHistory()
        }
    }, [])

    const handleColorChange = (color: string) => {
        setPrimaryColor(color)
        window.ipcRenderer.send('set-theme', color)
    }

    const filteredHistory = history.filter(item => {
        if (item.type === 'text' && item.text) {
            return item.text.toLowerCase().includes(searchTerm.toLowerCase())
        }
        if (item.type === 'image') {
            return searchTerm === '' || searchTerm.toLowerCase() === 'image'
        }
        return false
    })

    const handleCopy = (item: HistoryItem) => {
        window.ipcRenderer.send('copy-item', item)
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
                    handleCopy(filteredHistory[selectedIndex])
                }
            } else if (e.key === 'Escape') {
                setShowColorPicker(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [filteredHistory, selectedIndex])

    return (
        <div className="h-screen w-screen flex flex-col glass rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {/* Header / Search */}
            <div className="p-4 drag-region pb-2 flex flex-col space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white/10 border border-white/20 shadow-lg">
                            <img
                                src="/app_logo_icon.png"
                                alt="Logo"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <h1
                            className="text-md font-bold bg-clip-text text-transparent tracking-tight transition-all duration-500"
                            style={{ backgroundImage: `linear-gradient(to bottom, white, ${primaryColor}cc)` }}
                        >
                            CopyPasteFriend
                        </h1>
                    </div>

                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className={cn(
                            "p-1.5 rounded-lg transition-all no-drag relative group",
                            showColorPicker ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"
                        )}
                    >
                        <Palette className="w-4 h-4" />
                        <div
                            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-black shadow-sm"
                            style={{ backgroundColor: primaryColor }}
                        />
                    </button>
                </div>

                <AnimatePresence>
                    {showColorPicker && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="flex items-center justify-center space-x-4 p-3 bg-black/20 rounded-xl no-drag border border-white/5 shadow-inner overflow-hidden"
                        >
                            {THEME_COLORS.map(color => (
                                <button
                                    key={color.value}
                                    onClick={() => handleColorChange(color.value)}
                                    className={cn(
                                        "w-5 h-5 rounded-full transition-all hover:scale-125 relative flex items-center justify-center",
                                        primaryColor === color.value ? "after:content-[''] after:w-1.5 after:h-1.5 after:bg-white after:rounded-full after:shadow-sm" : ""
                                    )}
                                    style={{ backgroundColor: color.value, boxShadow: primaryColor === color.value ? `0 0 12px ${color.value}66` : 'none' }}
                                    title={color.name}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="relative no-drag">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
                        style={{ color: `${primaryColor}66` }}
                    />
                    <input
                        type="text"
                        placeholder="Search clipboard..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none text-white placeholder:text-white/20 transition-all"
                        style={{ borderBottom: `2px solid ${showColorPicker ? primaryColor : 'transparent'}` }}
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
                                    "p-3 rounded-xl transition-all cursor-pointer group flex flex-col space-y-1 relative no-drag border",
                                    selectedIndex === index
                                        ? "shadow-lg"
                                        : "hover:bg-white/5 border-transparent"
                                )}
                                style={selectedIndex === index ? {
                                    backgroundColor: `${primaryColor}20`,
                                    borderColor: `${primaryColor}30`
                                } : {}}
                                onClick={() => handleCopy(item)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="text-sm text-white/90 line-clamp-3 break-all font-medium pr-8 w-full">
                                        {item.type === 'text' ? (
                                            item.text
                                        ) : (
                                            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black/10 border border-white/5 mt-1">
                                                <img
                                                    src={item.image}
                                                    alt="Clipboard"
                                                    className="w-full h-full object-contain"
                                                />
                                                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/40 text-[8px] text-white/50 backdrop-blur-sm">
                                                    IMAGE
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <Copy
                                        className="shrink-0 w-3.5 h-3.5 transition-opacity"
                                        style={{
                                            opacity: selectedIndex === index ? 0.6 : 0,
                                            color: primaryColor
                                        }}
                                    />
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
                </div>
                <button
                    onClick={handleClear}
                    className="hover:text-red-400/80 transition-colors flex items-center space-x-1 no-drag px-2 py-1 rounded-md hover:bg-white/5"
                >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                </button>
            </div>
        </div>
    )
}

export default App
