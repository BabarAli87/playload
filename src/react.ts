import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from 'react'
import { OPTION_KEYS, Playload as PlayloadCore, type PlayloadEventName, type PlayloadOptions } from 'playload'

/** Event callbacks receive the event's `detail` directly (no CustomEvent to unwrap). */
export interface PlayloadEvents {
  onFilesAdded?: (detail: { files: File[] }) => void
  /** The game was won (hoop scored, claw grabbed, rocket launched). */
  onScore?: (detail: { file: File }) => void
  onMiss?: (detail: { file: File; misses: number }) => void
  /** Easy mode let a file through without playing. */
  onSkip?: (detail: { file: File }) => void
  onUploadStart?: (detail: { file: File }) => void
  onProgress?: (detail: { file: File; percent: number }) => void
  onUpload?: (detail: { file: File; response: unknown }) => void
  onCancel?: (detail: { file: File }) => void
  onError?: (detail: { file: File; error: unknown }) => void
}

export interface PlayloadProps extends PlayloadOptions, PlayloadEvents {
  className?: string
  style?: CSSProperties
  id?: string
}

export interface PlayloadHandle {
  addFiles(files: Iterable<File>, opts?: { direct?: boolean }): void
  /** Let the file waiting in the game through without playing. */
  skip(): void
  /** Abort every upload that is still running. */
  cancelAll(): void
  /** The underlying instance (null before mount / after unmount). */
  readonly instance: PlayloadCore | null
}

const EVENT_PROPS: Record<keyof PlayloadEvents, PlayloadEventName> = {
  onFilesAdded: 'filesadded',
  onScore: 'score',
  onMiss: 'miss',
  onSkip: 'skip',
  onUploadStart: 'uploadstart',
  onProgress: 'progress',
  onUpload: 'upload',
  onCancel: 'cancel',
  onError: 'error',
}

/**
 * <Playload theme="claw" uploadUrl="/api/upload" onUpload={({ file }) => ...} />
 *
 * Props are live: change `theme`, `scheme`, `labels`, `accept`... and the component updates in place
 * without losing queued files or running uploads. Removing a prop puts that option back to its default.
 * Renders an empty <div> on the server and builds the UI after mount, so it is SSR-safe.
 */
export const Playload = forwardRef<PlayloadHandle, PlayloadProps>(function Playload(props, ref) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const coreRef = useRef<PlayloadCore | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props // callbacks always see the latest props, with no resubscribing

  const optionsFrom = (p: PlayloadProps) => {
    const patch: Record<string, unknown> = {}
    for (const k of OPTION_KEYS) patch[k] = (p as Record<string, unknown>)[k]
    return patch as Partial<PlayloadOptions>
  }

  useEffect(() => {
    const host = hostRef.current!
    const core = new PlayloadCore(host, optionsFrom(propsRef.current))
    coreRef.current = core
    const offs = (Object.keys(EVENT_PROPS) as (keyof PlayloadEvents)[]).map((prop) =>
      core.on(EVENT_PROPS[prop], (e) => {
        const fn = propsRef.current[prop] as ((d: unknown) => void) | undefined
        fn?.(e.detail)
      }),
    )
    return () => {
      offs.forEach((off) => off())
      core.destroy()
      coreRef.current = null
    }
  }, [])

  // push prop changes into the live instance (a no-op for anything that did not change)
  useEffect(() => {
    coreRef.current?.update(optionsFrom(props))
  })

  useImperativeHandle(ref, () => ({
    addFiles: (files, opts) => coreRef.current?.addFiles(files, opts),
    skip: () => coreRef.current?.skip(),
    cancelAll: () => coreRef.current?.cancelAll(),
    get instance() { return coreRef.current },
  }), [])

  // The inner div belongs to Playload (it manages its own classes), so className/style/id go on a wrapper.
  return createElement('div', { className: props.className, style: props.style, id: props.id }, createElement('div', { ref: hostRef }))
})
