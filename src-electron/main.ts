import { app, BrowserWindow, globalShortcut, clipboard, ipcMain, nativeImage } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { createStore } from './utils/store'

let win: any = null
let lastText = ""
let lastImageData = ""
let store: any = null
let storeFile: string = ""

function createWindow() {
  win = new BrowserWindow({
    width: 450,
    height: 600,
    frame: false,
    show: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.on('blur', () => {
    if (win) win.hide()
  })
}

function toggleWindow() {
  if (!win) return
  if (win.isVisible()) {
    win.hide()
  } else {
    win.center()
    win.show()
    win.focus()
    if (process.platform === 'darwin' && app && app.show) {
      app.show()
    }
  }
}

if (app && app.whenReady) {
  app.whenReady().then(() => {
    storeFile = path.join(app.getPath('userData'), 'paste-history.json')
    store = createStore(storeFile)

    createWindow()
    if (win) {
      win.center()
      win.show()
    }

    const updateHistory = (item: any) => {
      const history = (store.get('history') || []) as any[]
      // Avoid exact duplicates (simple check)
      const isDuplicate = history.some(h =>
        (item.type === 'text' && h.text === item.text) ||
        (item.type === 'image' && h.image === item.image)
      )

      if (isDuplicate) {
        // Move to top if duplicate
        const filtered = history.filter(h =>
          !(item.type === 'text' && h.text === item.text) &&
          !(item.type === 'image' && h.image === item.image)
        )
        const newHistory = [item, ...filtered].slice(0, 50)
        store.set('history', newHistory)
        if (win) win.webContents.send('clipboard-changed', newHistory)
        return
      }

      const newHistory = [item, ...history].slice(0, 50)
      store.set('history', newHistory)
      if (win) win.webContents.send('clipboard-changed', newHistory)
    }

    setInterval(() => {
      // Check Text
      const text = clipboard.readText()
      if (text && text !== lastText) {
        lastText = text
        updateHistory({ id: Date.now(), type: 'text', text, timestamp: new Date().toISOString() })
      }

      // Check Image
      const image = clipboard.readImage()
      if (!image.isEmpty()) {
        const dataUrl = image.toDataURL()
        if (dataUrl !== lastImageData) {
          lastImageData = dataUrl
          updateHistory({ id: Date.now(), type: 'image', image: dataUrl, timestamp: new Date().toISOString() })
        }
      }
    }, 1000)

    // Watch for Screenshots
    const desktopPath = path.join(app.getPath('home'), 'Desktop')
    fs.watch(desktopPath, (eventType, filename) => {
      if (eventType === 'rename' && filename && (filename.endsWith('.png') || filename.endsWith('.jpg'))) {
        const filePath = path.join(desktopPath, filename)
        // Wait a bit for the file to be fully written
        setTimeout(() => {
          if (fs.existsSync(filePath)) {
            try {
              const stats = fs.statSync(filePath)
              // Only pick up very new files (last 5 seconds) to avoid loops
              if (Date.now() - stats.mtimeMs < 5000) {
                const img = clipboard.readImage()
                // If it's not in clipboard already, or even if it is, let's try to read it
                // Actually, native screenshots GO to clipboard if you use Ctrl, 
                // but local files don't. We can read the file as an image.
                const fileImage = nativeImage.createFromPath(filePath)
                if (!fileImage.isEmpty()) {
                  const dataUrl = fileImage.toDataURL()
                  if (dataUrl !== lastImageData) {
                    lastImageData = dataUrl
                    updateHistory({ id: Date.now(), type: 'image', image: dataUrl, timestamp: new Date().toISOString() })
                  }
                }
              }
            } catch (e) {
              console.error('Error reading screenshot:', e)
            }
          }
        }, 500)
      }
    })

    globalShortcut.register('CommandOrControl+Shift+V', toggleWindow)
  })

  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })
} else {
  console.error('--- CRITICAL ERROR ---')
  console.error('Electron "app" module is undefined.')
  process.exit(1)
}

ipcMain.on('get-history', (event: any) => {
  event.reply('clipboard-history', store.get('history') || [])
})

ipcMain.on('copy-item', (_: any, item: any) => {
  if (item.type === 'text') {
    lastText = item.text
    clipboard.writeText(item.text)
  } else if (item.type === 'image') {
    const nImg = nativeImage.createFromDataURL(item.image)
    lastImageData = item.image
    clipboard.writeImage(nImg)
  }
  if (win) win.hide()
})

ipcMain.on('clear-history', () => {
  store.set('history', [])
  if (win) win.webContents.send('clipboard-changed', [])
})

// Theme persistence
ipcMain.on('set-theme', (_: any, color: string) => {
  if (store) store.set('theme-color', color)
})

ipcMain.handle('get-theme', () => {
  return store ? store.get('theme-color') : null
})
