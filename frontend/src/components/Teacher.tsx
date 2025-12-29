import React, { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export default function Teacher() {
  const socketRef = useRef<Socket | null>(null)
  const [question, setQuestion] = useState('')
  const [optionsText, setOptionsText] = useState('Yes,No')
  const [correctIndex, setCorrectIndex] = useState<number | null>(null)
  const parsedOptions = optionsText.split(',').map((s) => s.trim()).filter(Boolean)
  const [currentPoll, setCurrentPoll] = useState<any>(null)
  const [results, setResults] = useState<any | null>(null)
  const [students, setStudents] = useState<Array<any>>([])
  const [quizItems, setQuizItems] = useState<Array<any>>([])

  useEffect(() => {
    const s = io('http://localhost:4000')
    socketRef.current = s

    s.on('poll_started', (p: any) => {
      setCurrentPoll(p)
      setResults(null)
    })
    s.on('answer_update', (u: any) => {
      // could show live total votes
    })
    s.on('poll_results', (r: any) => {
      setResults(r)
      setCurrentPoll(null)
    })
    s.on('students_update', (list: any[]) => {
      setStudents(list)
    })

    return () => {
      s.disconnect()
      socketRef.current = null
    }
  }, [])

  function create() {
    const opts = optionsText.split(',').map((s) => s.trim()).filter(Boolean)
    const payload: any = { question, options: opts, duration: 60 }
    if (typeof correctIndex === 'number') payload.correctIndex = correctIndex
    socketRef.current?.emit('create_poll', payload, (resp: any) => {
      if (resp?.error) alert(resp.error)
      else {
        setQuestion('')
        setOptionsText('')
        setCorrectIndex(null)
      }
    })
  }

  function addToQuiz() {
    const opts = optionsText.split(',').map((s) => s.trim()).filter(Boolean)
    if (!question.trim() || opts.length === 0) return alert('Provide question and options')
    const item = { question, options: opts, duration: 60, correctIndex: correctIndex ?? null }
    setQuizItems((q) => [...q, item])
    setQuestion('')
    setOptionsText('')
    setCorrectIndex(null)
  }

  function startQuiz() {
    if (quizItems.length === 0) return alert('No quiz items')
    quizItems.forEach((it) => {
      socketRef.current?.emit('enqueue_poll', it)
    })
    socketRef.current?.emit('start_quiz', (resp: any) => {
      if (!resp?.ok) alert('Could not start quiz: ' + (resp?.reason || ''))
      else setQuizItems([])
    })
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Teacher</h2>
      <div>
        <input placeholder="Question" value={question} onChange={(e) => setQuestion(e.target.value)} />
      </div>
      <div>
        <input placeholder="Options (comma separated)" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ marginBottom: 8 }}>Click an option to mark it as the correct answer:</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {parsedOptions.length === 0 && <div style={{ color: '#6b7280' }}>No options yet</div>}
          {parsedOptions.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => setCorrectIndex(idx)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: correctIndex === idx ? '2px solid #10b981' : '1px solid #e5e7eb',
                background: correctIndex === idx ? '#ecfdf5' : '#fff',
                cursor: 'pointer'
              }}
            >
              {opt}{correctIndex === idx ? ' ✓' : ''}
            </button>
          ))}
        </div>
      </div>
      <div>
        <button onClick={create}>Create Poll</button>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Students</h3>
        <ul>
          {students.map((st: any) => (
            <li key={st.id}>{st.name} — score: {st.score}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Quiz Builder</h3>
        <div style={{ marginBottom: 8 }}>
          <button onClick={addToQuiz} style={{ marginRight: 8 }}>Add to Quiz</button>
          <button onClick={startQuiz}>Start Quiz</button>
        </div>
        <div>
          {quizItems.length === 0 ? <div style={{ color: '#6b7280' }}>No queued questions</div> : (
            <ol>
              {quizItems.map((q, i) => <li key={i}>{q.question} ({q.options.join(', ')})</li>)}
            </ol>
          )}
        </div>
      </div>

      {currentPoll && (
        <div style={{ marginTop: 20 }}>
          <h3>Active Poll</h3>
          <div>{currentPoll.question}</div>
          <div>Options: {currentPoll.options.join(', ')}</div>
          <div>Time left: {currentPoll.remaining}s</div>
        </div>
      )}

      {results && (
        <div style={{ marginTop: 20 }}>
          <h3>Results</h3>
          <div>Question: {results.question}</div>
          <ul>
            {results.options.map((o: any, idx: number) => (
              <li key={idx}>{o.text}: {o.votes}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
