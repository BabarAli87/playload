export interface UploadContext {
  onProgress: (percent: number) => void
  signal: AbortSignal
}

export type UploadFn = (file: File, ctx: UploadContext) => Promise<unknown>

export interface XhrOptions {
  url: string
  method?: string
  fieldName?: string
  headers?: Record<string, string>
  withCredentials?: boolean
  /** Form field that carries the folder path of a file from a dropped/chosen folder. Default 'path'. */
  pathField?: string
}

/** Default uploader: multipart/form-data over XHR so we get real progress. */
export function xhrUploader(opts: XhrOptions): UploadFn {
  return (file, { onProgress, signal }) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open(opts.method ?? 'POST', opts.url)
      xhr.withCredentials = !!opts.withCredentials
      for (const [k, v] of Object.entries(opts.headers ?? {})) xhr.setRequestHeader(k, v)
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100)
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let body: unknown = xhr.responseText
          try { body = JSON.parse(xhr.responseText) } catch { /* keep text */ }
          resolve(body)
        } else reject(new Error(`Upload failed (${xhr.status})`))
      }
      xhr.onerror = () => reject(new Error('Network error'))
      xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'))
      signal.addEventListener('abort', () => xhr.abort())
      const form = new FormData()
      // the path goes BEFORE the file so streaming parsers (multer, busboy) have it when the file arrives
      const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath
      if (rel) form.append(opts.pathField ?? 'path', rel)
      form.append(opts.fieldName ?? 'file', file)
      xhr.send(form)
    })
}
