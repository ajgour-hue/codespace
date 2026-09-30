import { useState, useEffect, useCallback } from 'react'

const FILE_ICONS = {
  jsx: '⚛',
  tsx: '⚛',
  js: '🟡',
  ts: '🔷',
  css: '🎨',
  html: '🌐',
  json: '{}',
  md: '📝',
  png: '🖼',
  svg: '🔶',
  jpg: '🖼',
  jpeg: '🖼',
  env: '🔒',
  gitignore: '🙈',
  dockerfile: '🐳',
  default: '📄',
}

function getIcon(filename) {
  const parts = filename.split('.')

  if (parts.length === 1) {
    return FILE_ICONS.default
  }

  const ext = parts[parts.length - 1].toLowerCase()

  return FILE_ICONS[ext] || FILE_ICONS.default
}

function buildTree(files) {
  const root = {}

  files.forEach((path) => {
    const parts = path.split('/')

    let node = root

    parts.forEach((part, i) => {
      if (!node[part]) {
        node[part] =
          i === parts.length - 1
            ? null
            : {}
      }

      if (i < parts.length - 1) {
        node = node[part]
      }
    })
  })

  return root
}

function TreeNode({
  name,
  node,
  depth,
  activeFile,
  onFileSelect,
  path,
}) {
  const [open, setOpen] = useState(depth < 2)

  const isDir =
    node !== null &&
    typeof node === 'object'

  const fullPath =
    path
      ? `${path}/${name}`
      : name

  const isActive =
    activeFile === fullPath

  if (isDir) {
    return (
      <div>
        <button
          onClick={() =>
            setOpen((o) => !o)
          }
          className="flex items-center gap-1.5 w-full text-left px-2 py-0.5 rounded transition-colors duration-100 cursor-pointer"
          style={{
            paddingLeft:
              `${8 + depth * 14}px`,
            color: '#94A3B8',
            fontSize: '13px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              'rgba(255,255,255,0.04)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              'transparent'
          }}
        >
          <span
            className="text-xs transition-transform duration-150"
            style={{
              transform: open
                ? 'rotate(90deg)'
                : 'none',
              display: 'inline-block',
            }}
          >
            ▶
          </span>

          <span className="mr-1">
            {open ? '📂' : '📁'}
          </span>

          <span className="truncate">
            {name}
          </span>
        </button>

        {open && (
          <div>
            {Object.entries(node)
              .sort(([, a], [, b]) => {
                const aDir =
                  a !== null &&
                  typeof a === 'object'

                const bDir =
                  b !== null &&
                  typeof b === 'object'

                return bDir - aDir
              })
              .map(
                ([childName, childNode]) => (
                  <TreeNode
                    key={childName}
                    name={childName}
                    node={childNode}
                    depth={depth + 1}
                    activeFile={activeFile}
                    onFileSelect={onFileSelect}
                    path={fullPath}
                  />
                )
              )}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() =>
        onFileSelect(fullPath)
      }
      className="flex items-center gap-1.5 w-full text-left px-2 py-0.5 rounded transition-all duration-100 cursor-pointer"
      style={{
        paddingLeft:
          `${8 + depth * 14}px`,
        fontSize: '13px',
        color: isActive
          ? '#3B82F6'
          : '#94A3B8',
        background: isActive
          ? 'rgba(59,130,246,0.08)'
          : 'transparent',
        borderLeft: isActive
          ? '2px solid #3B82F6'
          : '2px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background =
            'rgba(255,255,255,0.04)'

          e.currentTarget.style.color =
            '#F8FAFC'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background =
            'transparent'

          e.currentTarget.style.color =
            '#94A3B8'
        }
      }}
    >
      <span>
        {getIcon(name)}
      </span>

      <span className="truncate">
        {name}
      </span>
    </button>
  )
}

export default function FileExplorer({
  agentBase,
  activeFile,
  onFileSelect,
  refreshKey,
}) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tree, setTree] = useState({})

  const fetchFiles = useCallback(async () => {
    if (!agentBase) {
      console.error(
        'FileExplorer: agentBase missing'
      )

      return
    }

    setLoading(true)
    setError(null)

    const url =
      `${agentBase}/list-files`

    console.log(
      'FILE EXPLORER REQUEST:',
      url
    )

    try {
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })

      console.log(
        'FILE EXPLORER RESPONSE:',
        res.status,
        res.statusText
      )

      if (!res.ok) {
        const text = await res.text()

        console.error(
          'LIST FILES ERROR:',
          res.status,
          text
        )

        throw new Error(
          `list-files failed: ${res.status} ${res.statusText}`
        )
      }

      const data = await res.json()

      console.log(
        'LIST FILES DATA:',
        data
      )

      const fileList = Array.isArray(data)
        ? data
        : data.files || []

      setFiles(fileList)
      setTree(buildTree(fileList))

    } catch (err) {
      console.error(
        'FILE EXPLORER ERROR:',
        err
      )

      setError(
        err.message ||
        'Failed to load files'
      )

    } finally {
      setLoading(false)
    }
  }, [agentBase])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles, refreshKey])

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        width: '220px',
        minWidth: '220px',
        background: '#080B12',
        borderRight:
          '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Header */}

      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{
          borderBottom:
            '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{
            color: '#64748B',
          }}
        >
          Explorer
        </span>

        <button
          onClick={fetchFiles}
          className="p-1 rounded transition-colors cursor-pointer"
          style={{
            color: '#64748B',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color =
              '#3B82F6'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color =
              '#64748B'
          }}
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {/* File Tree */}

      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div
              className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
              style={{
                borderColor: '#3B82F6',
                borderTopColor:
                  'transparent',
              }}
            />
          </div>
        ) : error ? (
          <div
            className="px-3 py-4 text-xs"
            style={{
              color: '#ef4444',
            }}
          >
            {error}
          </div>
        ) : (
          Object.entries(tree)
            .sort(([, a], [, b]) => {
              const aDir =
                a !== null &&
                typeof a === 'object'

              const bDir =
                b !== null &&
                typeof b === 'object'

              return bDir - aDir
            })
            .map(([name, node]) => (
              <TreeNode
                key={name}
                name={name}
                node={node}
                depth={0}
                activeFile={activeFile}
                onFileSelect={
                  onFileSelect
                }
                path=""
              />
            ))
        )}
      </div>

      {/* Footer */}

      {!loading && files.length > 0 && (
        <div
          className="px-3 py-1.5 shrink-0"
          style={{
            borderTop:
              '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span
            className="text-xs"
            style={{
              color: '#64748B',
            }}
          >
            {files.length} files
          </span>
        </div>
      )}
    </aside>
  )
}