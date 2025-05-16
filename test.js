const test = [{ test: 1 }, { test: 2 }, { test: 3 }]

// Encode para base64
const base64 = Buffer.from(JSON.stringify(test)).toString('base64')
console.log({ base64 })

// Decode de volta para o objeto original
const decoded = Buffer.from(base64, 'base64').toString('utf-8')
const original = JSON.parse(decoded)
console.log({ original })