const a='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
export const nanoid=(n=10)=>Array.from(crypto.getRandomValues(new Uint8Array(n))).map(b=>a[b%62]).join('')
