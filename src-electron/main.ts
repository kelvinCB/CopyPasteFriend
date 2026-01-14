const { app, BrowserWindow, globalShortcut, clipboard, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const { createStore } = require('./utils/store')

let win: any = null
let lastText = ""
let store: any = null
let storeFile: string = ""

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

    setInterval(() => {
      const text = clipboard.readText()
      if (text && text !== lastText) {
        lastText = text
        const history = (store.get('history') || []) as any[]
        const newHistory = [
          { id: Date.now(), text, timestamp: new Date().toISOString() },
          ...history.filter((item: any) => item.text !== text),
        ].slice(0, 50)
        store.set('history', newHistory)
        if (win) win.webContents.send('clipboard-changed', newHistory)
      }
    }, 1000)

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

ipcMain.on('copy-text', (_: any, text: string) => {
  lastText = text
  clipboard.writeText(text)
  if (win) win.hide()
})

ipcMain.on('clear-history', () => {
  store.set('history', [])
  if (win) win.webContents.send('clipboard-changed', [])
})
