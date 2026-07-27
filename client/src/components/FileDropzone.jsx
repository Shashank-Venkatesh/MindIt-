import { useRef, useState } from 'react'
import { Icon } from './ui'
import { formatBytes } from '../lib/pipeline'

export function FileDropzone({ fileMeta, onFile, onRemove }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(fileList) {
    if (fileList && fileList[0]) {
      onFile(fileList[0])
    }
  }

  const statusStyles = {
    ready: 'border-primary/30 bg-primary/5',
    reading: 'border-border bg-surface-alt',
    unsupported: 'border-tertiary/30 bg-tertiary/5',
    error: 'border-danger/30 bg-danger/5',
  }

  const statusIcon = {
    ready: 'check_circle',
    reading: 'progress_activity',
    unsupported: 'info',
    error: 'error',
  }

  const statusIconClass = {
    ready: 'text-primary',
    reading: 'animate-spin text-on-surface-variant',
    unsupported: 'text-tertiary',
    error: 'text-danger',
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          handleFiles(event.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            inputRef.current?.click()
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition ${
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-on-surface-variant/40'
        }`}
      >
        <Icon name="upload_file" className="text-[24px] text-on-surface-variant" />
        <p className="text-sm font-medium text-on-surface">Drag &amp; drop a file, or click to browse</p>
        <p className="text-xs text-on-surface-variant">Supports .txt and .md files</p>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,.markdown"
          hidden
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {fileMeta ? (
        <div className={`mt-3 flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-sm ${statusStyles[fileMeta.status]}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <Icon name={statusIcon[fileMeta.status]} className={`text-[18px] ${statusIconClass[fileMeta.status]}`} />
            <div className="min-w-0">
              <p className="truncate font-medium text-on-surface">{fileMeta.name}</p>
              <p className="text-xs text-on-surface-variant">
                {formatBytes(fileMeta.size)}
                {fileMeta.status === 'reading' ? ' · Reading…' : ''}
                {fileMeta.status === 'ready' ? ' · Loaded' : ''}
                {fileMeta.status === 'unsupported' ? ' · Only .txt and .md are supported right now' : ''}
                {fileMeta.status === 'error' ? ' · Could not read this file' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 rounded-md p-1 text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface"
            aria-label="Remove file"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
