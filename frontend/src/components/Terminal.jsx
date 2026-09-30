import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react'

import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { io } from 'socket.io-client'

export default function Terminal({
  sandboxId,
  agentBase,
}) {
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const fitAddonRef = useRef(null)
  const socketRef = useRef(null)
  const inputDisposableRef = useRef(null)

  const [connected, setConnected] =
    useState(false)

  const [error, setError] =
    useState(null)

  // =====================================================
  // Initialize XTerm
  // =====================================================

  const initTerminal = useCallback(() => {
    if (
      !containerRef.current ||
      termRef.current
    ) {
      return null
    }

    const term = new XTerm({
      theme: {
        background: '#0B0F17',
        foreground: '#E2E8F0',

        cursor: '#8B5CF6',
        cursorAccent: '#0B0F17',

        selectionBackground:
          'rgba(139,92,246,0.22)',

        black: '#11161F',
        red: '#EF4444',
        green: '#22C55E',
        yellow: '#F59E0B',
        blue: '#3B82F6',
        magenta: '#8B5CF6',
        cyan: '#38BDF8',
        white: '#E2E8F0',

        brightBlack: '#475569',
        brightRed: '#F87171',
        brightGreen: '#4ADE80',
        brightYellow: '#FBBF24',
        brightBlue: '#60A5FA',
        brightMagenta: '#A78BFA',
        brightCyan: '#67E8F9',
        brightWhite: '#F8FAFC',
      },

      fontFamily:
        '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',

      fontSize: 12,
      lineHeight: 1.45,

      cursorBlink: true,
      cursorStyle: 'bar',

      scrollback: 5000,

      allowProposedApi: true,

      convertEol: true,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon =
      new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)

    term.open(containerRef.current)

    try {
      fitAddon.fit()
    } catch (err) {
      console.error(
        'Terminal fit error:',
        err
      )
    }

    termRef.current = term
    fitAddonRef.current = fitAddon

    // Initial terminal screen

    term.writeln(
      '\x1b[36m╭────────────────────────────────────────────╮\x1b[0m'
    )

    term.writeln(
      '\x1b[36m│  \x1b[1;37mSandbox Terminal\x1b[0m\x1b[36m                         │\x1b[0m'
    )

    term.writeln(
      '\x1b[36m╰────────────────────────────────────────────╯\x1b[0m'
    )

    term.writeln('')

    term.writeln(
      '\x1b[90mConnecting to sandbox...\x1b[0m'
    )

    return term
  }, [])

  // =====================================================
  // Connect Socket.IO
  // =====================================================

  const connectSocket = useCallback(
    (term) => {
      if (
        !sandboxId ||
        !agentBase ||
        !term
      ) {
        console.error(
          'Terminal: missing sandboxId or agentBase',
          {
            sandboxId,
            agentBase,
          }
        )

        return
      }

      // Connect directly to this sandbox's agent domain.
      // agentBase should be like:
      // https://<sandboxId>.agent.cryboy.online
      const socket = io(agentBase, {
        path: '/socket.io/',
        transports: ['polling'],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 10000,
      })

      socketRef.current = socket

      // =================================================
      // CONNECTED
      // =================================================

      socket.on('connect', () => {
        console.log(
          'TERMINAL SOCKET CONNECTED:',
          socket.id
        )

        setConnected(true)
        setError(null)

        term.writeln(
          '\r\n\x1b[32m✓ Connected to sandbox shell\x1b[0m'
        )

        term.writeln('')
      })

      // =================================================
      // DISCONNECTED
      // =================================================

      socket.on(
        'disconnect',
        (reason) => {
          console.log(
            'TERMINAL SOCKET DISCONNECTED:',
            reason
          )

          setConnected(false)

          if (
            reason !==
            'io client disconnect'
          ) {
            term.writeln(
              '\r\n\x1b[33m⚠ Connection lost. Reconnecting...\x1b[0m'
            )
          }
        }
      )

      // =================================================
      // CONNECTION ERROR
      // =================================================

      socket.on(
        'connect_error',
        (err) => {
          console.error(
            'TERMINAL SOCKET ERROR:',
            err
          )

          setConnected(false)

          setError(
            err.message ||
            'Connection failed'
          )

          term.writeln(
            `\r\n\x1b[31m✗ Connection error: ${err.message}\x1b[0m`
          )
        }
      )

      // =================================================
      // TERMINAL OUTPUT
      // =================================================

      socket.on(
        'terminal-output',
        (data) => {
          if (termRef.current) {
            termRef.current.write(data)
          }
        }
      )

      // =================================================
      // TERMINAL INPUT
      // =================================================

      inputDisposableRef.current =
        term.onData((data) => {
          if (
            socket.connected
          ) {
            socket.emit(
              'terminal-input',
              data
            )
          }
        })
    },
    [sandboxId, agentBase]
  )

  // =====================================================
  // Initialize + Connect
  // =====================================================

  useEffect(() => {
    const term = initTerminal()

    if (term) {
      connectSocket(term)
    }

    return () => {
      // Remove terminal input listener

      if (
        inputDisposableRef.current
      ) {
        inputDisposableRef.current.dispose()
        inputDisposableRef.current = null
      }

      // Disconnect socket

      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }

      // Dispose terminal

      if (termRef.current) {
        termRef.current.dispose()
        termRef.current = null
      }

      fitAddonRef.current = null

      setConnected(false)
    }
  }, [
    initTerminal,
    connectSocket,
  ])

  // =====================================================
  // Resize
  // =====================================================

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const observer =
      new ResizeObserver(() => {
        if (fitAddonRef.current) {
          try {
            fitAddonRef.current.fit()
          } catch (err) {
            console.error(
              'Terminal resize error:',
              err
            )
          }
        }
      })

    observer.observe(
      containerRef.current
    )

    return () => {
      observer.disconnect()
    }
  }, [])

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: '#0B0F17',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ================================================
          TERMINAL HEADER
      ================================================= */}

      <div
        className="flex items-center justify-between shrink-0"
        style={{
          height: '40px',
          padding: '0 14px',

          background: '#0D1118',

          borderBottom:
            '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Left */}

        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-md"
            style={{
              width: '24px',
              height: '24px',

              background:
                'rgba(139,92,246,0.10)',

              color: '#A78BFA',

              fontFamily:
                'monospace',

              fontSize: '12px',

              border:
                '1px solid rgba(139,92,246,0.16)',
            }}
          >
            &gt;_
          </div>

          <span
            className="text-[11px] font-semibold tracking-wider"
            style={{
              color: '#94A3B8',
            }}
          >
            TERMINAL
          </span>

          {sandboxId && (
            <span
              className="text-[9px] font-mono"
              style={{
                color: '#64748B',
              }}
            >
              {sandboxId.slice(0, 8)}
            </span>
          )}
        </div>

        {/* Right */}

        <div className="flex items-center gap-3">
          {error && (
            <span
              className="text-[10px] max-w-[220px] truncate"
              style={{
                color: '#f87171',
              }}
              title={error}
            >
              {error}
            </span>
          )}

          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md"
            style={{
              color: connected
                ? '#22C55E'
                : '#64748B',
              background: connected
                ? 'rgba(34,197,94,0.06)'
                : 'rgba(100,116,139,0.06)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background:
                  connected
                    ? '#22c55e'
                    : '#475569',

                boxShadow:
                  connected
                    ? '0 0 8px rgba(34,197,94,.7)'
                    : 'none',
              }}
            />

            <span className="text-[10px]">
              {connected
                ? 'Connected'
                : 'Connecting'}
            </span>
          </div>
        </div>
      </div>

      {/* ================================================
          TERMINAL BODY
      ================================================= */}

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{
          padding: '8px 10px',
          background: '#0B0F17',
        }}
      />
    </div>
  )
}