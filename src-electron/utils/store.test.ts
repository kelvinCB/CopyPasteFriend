import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { createStore } from './store'

describe('Store Utility', () => {
    const testFilePath = path.join(__dirname, 'test-history.json')

    beforeEach(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath)
        }
    })

    afterEach(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath)
        }
    })

    it('should return undefined if key does not exist', () => {
        const store = createStore(testFilePath)
        expect(store.get('history')).toBeUndefined()
    })

    it('should save and retrieve data correctly', () => {
        const store = createStore(testFilePath)
        const testData = [{ id: 1, text: 'hello' }]

        store.set('history', testData)
        expect(store.get('history')).toEqual(testData)
    })

    it('should append data to existing file', () => {
        const store = createStore(testFilePath)
        store.set('one', 1)
        store.set('two', 2)

        expect(store.get('one')).toBe(1)
        expect(store.get('two')).toBe(2)

        const fileContent = JSON.parse(fs.readFileSync(testFilePath, 'utf8'))
        expect(fileContent).toEqual({ one: 1, two: 2 })
    })
})
