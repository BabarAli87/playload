/** `accept` works like <input accept>: ".pdf", "image/*", "application/pdf". */
export function matchesAccept(file: File, accept: string[]): boolean {
  if (!accept.length) return true
  const name = file.name.toLowerCase()
  return accept.some((a) => {
    a = a.trim().toLowerCase()
    if (a.startsWith('.')) return name.endsWith(a)
    if (a.endsWith('/*')) return file.type.toLowerCase().startsWith(a.slice(0, -1))
    return file.type.toLowerCase() === a
  })
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  return `${+(bytes / 1024 ** 2).toFixed(1)} MB`
}
