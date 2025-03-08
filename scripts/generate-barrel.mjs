#!/usr/bin/env bun
import { readdir } from 'node:fs/promises'
import { basename } from 'node:path'

const main = async (dir = './src/audio', out = './src/audio') => {
    const functionNamesAndPaths = (await readdir(dir, { recursive: true }))
        .filter((file) => file.endsWith('.js'))
        .filter((file) => file !== 'index.js')
        .map((file) => file.replace(dir + '/', ''))
        .map((file) => file.replace(/\\/g, '/'))
        .map((file) => {
            const name = basename(file, '.js')
            const path = file.replace(/\\/g, '/')
            return { name, path }
        })
    Bun.write(`${out}/index.js`, exportTemplate(functionNamesAndPaths))
}
const exportTemplate = (functionNamesAndPaths) => {
    return `${functionNamesAndPaths.map((fn) => `export { default as ${fn.name} } from "./${fn.path}"`).join('\n')}
export const AudioFeatures = ${JSON.stringify(
        functionNamesAndPaths.map(({ name }) => name),
        null,
        2,
    )}`.trim()
}
main()
