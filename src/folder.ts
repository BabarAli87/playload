/** OS metadata files nobody wants uploaded. */
const JUNK = new Set(['.ds_store', 'thumbs.db', 'desktop.ini'])
export const isJunk = (name: string) => JUNK.has(name.toLowerCase())

export interface DroppedItem {
  entry: FileSystemEntry | null
  file: File | null
}

/**
 * Read what was dropped. MUST run synchronously inside the drop handler:
 * browsers invalidate `dataTransfer.items` as soon as the event finishes.
 */
export function snapshotDrop(dt: DataTransfer): DroppedItem[] {
  return Array.from(dt.items ?? [])
    .filter((i) => i.kind === 'file')
    .map((i) => ({ entry: i.webkitGetAsEntry?.() ?? null, file: i.getAsFile() }))
}

export const hasFolder = (items: DroppedItem[]) => items.some((i) => i.entry?.isDirectory)

/** Give a File the folder path it came from (File.webkitRelativePath is read-only, so we define it on the instance). */
export function withPath(file: File, path: string): File {
  if (path) Object.defineProperty(file, 'webkitRelativePath', { value: path, configurable: true })
  return file
}

const readFile = (e: FileSystemFileEntry) => new Promise<File>((res, rej) => e.file(res, rej))
const readBatch = (r: FileSystemDirectoryReader) => new Promise<FileSystemEntry[]>((res, rej) => r.readEntries(res, rej))

/**
 * Walk dropped files and folders (recursively) into a flat list of Files with `webkitRelativePath` set.
 * Stops after `limit` files (`truncated: true`), and skips OS junk like .DS_Store.
 */
export async function readDropped(items: DroppedItem[], limit: number): Promise<{ files: File[]; truncated: boolean }> {
  const files: File[] = []
  let truncated = false

  async function walk(entry: FileSystemEntry, parent: string) {
    if (files.length >= limit) { truncated = true; return }
    if (entry.isFile) {
      if (isJunk(entry.name)) return
      const file = await readFile(entry as FileSystemFileEntry)
      files.push(withPath(file, parent ? parent + file.name : ''))
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader()
      const here = parent + entry.name + '/'
      // readEntries returns results in batches (often 100), so keep reading until it comes back empty
      for (;;) {
        const batch = await readBatch(reader)
        if (!batch.length) break
        for (const child of batch) {
          await walk(child, here)
          if (truncated) return
        }
      }
    }
  }

  for (const item of items) {
    if (item.entry) await walk(item.entry, '')
    else if (item.file) { if (files.length >= limit) truncated = true; else files.push(item.file) }
    if (truncated) break
  }
  return { files, truncated }
}

/** For <input webkitdirectory>: drop junk, cap the count. Paths are already set by the browser. */
export function fromDirectoryInput(list: File[], limit: number): { files: File[]; truncated: boolean } {
  const files = list.filter((f) => !isJunk(f.name))
  return files.length > limit ? { files: files.slice(0, limit), truncated: true } : { files, truncated: false }
}
