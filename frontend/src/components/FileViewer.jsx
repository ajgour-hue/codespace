import { useState, useEffect } from 'react'

const LANGUAGE_MAP = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  css: 'css',
  html: 'html',
  json: 'json',
  md: 'markdown',
  py: 'python',
  sh: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
}

function getLanguage(filename) {
  const ext = filename
    .split('.')
    .pop()
    ?.toLowerCase()

  return LANGUAGE_MAP[ext] || 'plaintext'
}

export default function FileViewer({
  agentBase,
  filePath,
}) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!agentBase || !filePath) {
      return
    }

    const fetchFile = async () => {
      setLoading(true)
      setError(null)
      setContent(null)

      const url =
        `${agentBase}/read-files?files=${encodeURIComponent(filePath)}`

      console.log('FILE VIEWER REQUEST:', url)

      try {
        const res = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })

        console.log(
          'FILE VIEWER RESPONSE:',
          res.status,
          res.statusText
        )

        if (!res.ok) {
          const text = await res.text()

          console.error(
            'READ FILE ERROR:',
            res.status,
            text
          )

          throw new Error(
            `read-files failed: ${res.status} ${res.statusText}`
          )
        }

        const data = await res.json()

        console.log(
          'FILE VIEWER DATA:',
          data
        )

        const fileData = data.files?.[0]

        if (!fileData) {
          setError('File not found or empty')
          return
        }

        /*
         * Expected possible response:
         *
         * {
         *   files: [
         *     {
         *       "src/App.jsx": "file content..."
         *     }
         *   ]
         * }
         */

        const fileContent =
          fileData[filePath] ??
          Object.values(fileData)[0]

        if (
          fileContent === undefined ||
          fileContent === null
        ) {
          setError('File content is empty')
          return
        }

        setContent(String(fileContent))
      } catch (err) {
        console.error(
          'FILE VIEWER ERROR:',
          err
        )

        setError(
          err.message ||
          'Failed to load file'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchFile()
  }, [agentBase, filePath])

  // =====================================================
  // No file selected
  // =====================================================

  if (!filePath) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3"
        style={{
          color: '#64748B',
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>

        <p className="text-sm">
          Select a file from the explorer
        </p>
      </div>
    )
  }

  // =====================================================
  // File viewer
  // =====================================================

  return (
    <div className="flex flex-col h-full">

      {/* File tab bar */}

      <div
        className="flex items-center gap-2 px-3 shrink-0"
        style={{
          height: '36px',
          background: '#0B0F17',
          borderBottom:
            '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-t"
          style={{
            background: '#0D1118',
            border:
              '1px solid rgba(255,255,255,0.08)',
            borderBottom: 'none',
            marginBottom: '-1px',
          }}
        >
          <span
            className="text-xs"
            style={{
              color: '#94A3B8',
            }}
          >
            {filePath.split('/').pop()}
          </span>

          <span
            className="text-xs px-1 rounded"
            style={{
              background:
                'rgba(59,130,246,0.08)',
              color: '#64748B',
            }}
          >
            {getLanguage(filePath)}
          </span>
        </div>
      </div>

      {/* Content */}

      <div
        className="flex-1 overflow-auto relative"
        style={{
          background: '#0B0F17',
        }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-6 h-6 rounded-full border-2 border-t-transparent"
              style={{
                borderColor: '#3B82F6',
                borderTopColor:
                  'transparent',
                animation:
                  'spin 0.8s linear infinite',
              }}
            />
          </div>
        )}

        {error && (
          <div
            className="p-6 text-sm"
            style={{
              color: '#ef4444',
            }}
          >
            {error}
          </div>
        )}

        {content !== null &&
          !loading && (
            <pre
              className="p-4 text-xs leading-relaxed overflow-auto h-full"
              style={{
                color: '#94A3B8',
                fontFamily:
                  '"JetBrains Mono", "Fira Code", monospace',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              <code>{content}</code>
            </pre>
          )}
      </div>
    </div>
  )
}