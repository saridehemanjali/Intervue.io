import React, { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

export default function Student() {
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [poll, setPoll] = useState<any | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [results, setResults] = useState<any | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false) // added
  const socketRef = useRef<Socket | null>(null)
  const [socketId, setSocketId] = useState<string | null>(null)
  const [score, setScore] = useState<number>(0)

  useEffect(() => {
    // create socket after mount (prevents issues during SSR or module-eval failures)
    const s = io('http://localhost:4000')
    socketRef.current = s

    // debug: log runtime info and expose component/source for console inspection
    if (typeof window !== 'undefined') {
      console.log('Student component mounted', { href: window.location.href, port: window.location.port })
      // @ts-ignore - expose for quick debugging in DevTools console
      window.__STUDENT_DEBUG = {
        component: Student,
        source: Student.toString(),
      }
    }

    const savedName = typeof window !== 'undefined' ? localStorage.getItem('student_name') : null
    if (savedName) {
      setName(savedName)
      // join after socket is created
      s.emit('join_student', { name: savedName })
      setJoined(true)
    }

    s.on('poll_started', (p: any) => {
      setPoll(p)
      setResults(null)
      setTimeLeft(p?.remaining ?? null)
      setSubmitted(false)
    })

    s.on('poll_results', (r: any) => {
      setResults(r)
      setPoll(null)
      setSelected(null)
      setTimeLeft(null)
    })

    s.on('quiz_finished', (payload: any) => {
      // final quiz finished — show final score summary
      const myId = socketRef.current?.id || null
      const savedNameInner = typeof window !== 'undefined' ? localStorage.getItem('student_name') : null
      let myScore = 0
      if (payload && Array.isArray(payload.students)) {
        const me = payload.students.find((x: any) => (myId && x.id === myId) || (savedNameInner && x.name === savedNameInner))
        if (me) {
          myScore = me.score || 0
          setScore(myScore)
        }
        console.log('quiz_finished payload', payload)
      }
      // always show popup so student sees final score even if matching failed
      try {
        alert(`Quiz finished. Your final score: ${myScore}`)
      } catch (e) {
        console.log('could not show alert', e)
      }
      // mark that quiz ended so UI can show final screen
      setResults((prev: any) => ({ ...(prev || {}), quizFinished: true }))
    })

    s.on('joined', (d: any) => {
      setSocketId(d.id)
    })

    s.on('students_update', (list: any[]) => {
      // prefer socket id (server provides id). fall back to saved name from localStorage
      const myId = socketRef.current?.id || null
      const savedNameInner = typeof window !== 'undefined' ? localStorage.getItem('student_name') : null
      let entry: any = null
      if (myId) entry = list.find((x) => x.id === myId)
      if (!entry && savedNameInner) entry = list.find((x) => x.name === savedNameInner)
      if (entry) setScore(entry.score || 0)
    })

    return () => {
      s.off('poll_started')
      s.off('poll_results')
      s.off('quiz_finished')
      s.off('joined')
      s.off('students_update')
      s.disconnect()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) return
    const id = setInterval(() => setTimeLeft((t) => (t !== null ? t - 1 : t)), 1000)
    return () => clearInterval(id)
  }, [timeLeft])

  function join(n: string) {
    if (typeof window !== 'undefined') localStorage.setItem('student_name', n)
    socketRef.current?.emit('join_student', { name: n })
    setJoined(true)
  }

  function submit() {
    if (!poll || selected === null) return
    socketRef.current?.emit('submit_answer', { pollId: poll.id, optionIndex: selected }, (resp: any) => {
      if (resp?.error) alert(resp.error)
      else setSubmitted(true)
    })
  }

  // helper to compute timer percent (safe)
  const timerPercent = (() => {
    if (!poll) return 0
    const dur = poll.duration ?? poll.total ?? null
    if (!dur || timeLeft === null) return 0
    return Math.max(0, Math.min(100, (timeLeft / dur) * 100))
  })()

  // helper to render result bars
  const renderResultBars = (opts: any[]) => {
    const total = opts.reduce((s, o) => s + (o.votes || 0), 0) || 1
    return opts.map((o: any, idx: number) => {
      const pct = Math.round(((o.votes || 0) / total) * 100)
      return (
        <div key={idx} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <div>{o.text}</div>
            <div>{o.votes} · {pct}%</div>
          </div>
          <div style={{ background: '#eee', height: 10, borderRadius: 6, overflow: 'hidden', marginTop: 6 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: '#4f46e5' }} />
          </div>
        </div>
      )
    })
  }

  return (
    <div style={{ padding: 24, backgroundColor: '#f6f7fb', color: '#111827', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 760 }}>
        <h2 style={{ margin: 0, marginBottom: 16, fontSize: 20, fontWeight: 600 }}>Student — score: {score}</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18 }}>
          {!joined ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8, width: 220 }}
              />
              <button
                onClick={() => join(name)}
                disabled={!name.trim()}
                style={{ padding: '8px 12px', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none' }}
              >
                Join
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 15 }}>Welcome, <strong>{name}</strong></div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 6px 20px rgba(15,23,42,0.06)', padding: 20 }}>
          {/* Poll area */}
          {!joined ? (
            <div>
              <input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
              />
              <button
                onClick={() => join(name)}
                disabled={!name.trim()}
                style={{ marginLeft: 8, padding: '8px 12px' }}
              >
                Join
              </button>
            </div>
          ) : (
            <div>
              <div>Welcome, {name}</div>
            </div>
          )}

          {!poll && !results && (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
              <div style={{ fontSize: 18, marginBottom: 8 }}>No active poll</div>
              <div style={{ fontSize: 13 }}>Wait for the instructor to start a poll. You will see the question and options here.</div>
            </div>
          )}

          {poll && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{poll.question}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{timeLeft !== null ? `${timeLeft}s` : ''}</div>
              </div>

              <div style={{ height: 8, background: '#f3f4f6', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ width: `${timerPercent}%`, height: '100%', background: '#4f46e5', transition: 'width 0.3s linear' }} />
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {Array.isArray(poll?.options) ? poll.options.map((opt: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelected(idx)}
                    disabled={submitted || (timeLeft !== null && timeLeft <= 0)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: selected === idx ? '2px solid #4f46e5' : '1px solid #e6e9ee',
                      background: selected === idx ? '#eef2ff' : '#fff',
                      cursor: submitted ? 'default' : 'pointer',
                      fontSize: 15
                    }}
                  >
                    {opt}
                  </button>
                )) : <div style={{ color: '#6b7280' }}>No options available</div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  onClick={submit}
                  disabled={selected === null || submitted || (timeLeft !== null && timeLeft <= 0)}
                  style={{ padding: '10px 14px', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none' }}
                >
                  {submitted ? 'Submitted' : 'Submit'}
                </button>
              </div>
            </div>
          )}

          {results && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{results.question}</div>
              <div>{renderResultBars(results.options || [])}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
