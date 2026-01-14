import fs from 'fs'

export interface Store {
    get: (key: string) => any
    set: (key: string, value: any) => void
}

export function createStore(storeFile: string): Store {
    return {
        get: (key: string) => {
            try {
                if (!storeFile || !fs.existsSync(storeFile)) return undefined
                const data = JSON.parse(fs.readFileSync(storeFile, 'utf8'))
                return data[key]
            } catch (e) {
                return undefined
            }
        },
        set: (key: string, value: any) => {
            try {
                if (!storeFile) return
                let data: any = {}
                if (fs.existsSync(storeFile)) {
                    try { data = JSON.parse(fs.readFileSync(storeFile, 'utf8')) } catch (e) { }
                }
                data[key] = value
                fs.writeFileSync(storeFile, JSON.stringify(data, null, 2))
            } catch (e) {
                console.error('Failed to save store:', e)
            }
        }
    }
}
