const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const PORT = process.env.PORT || 4000;

// In-memory store
let currentPoll = null;
let students = new Map(); // socketId -> { name, score }
let quizQueue = [] // array of { question, options, duration, correctIndex }

function createPoll({ question, options, duration = 60 }) {
  const poll = {
    id: `${Date.now()}`,
    question,
    options: options.map((opt) => ({ text: opt, votes: 0 })),
    startedAt: Date.now(),
    duration: duration, // seconds
    answers: {}, // socketId -> optionIndex
    finished: false,
  };

  currentPoll = poll;

  // timer
  poll._timeout = setTimeout(() => {
    finishPoll(poll.id);
  }, poll.duration * 1000);

  return poll;
}

function finishPoll(pollId) {
  if (!currentPoll || currentPoll.id !== pollId) return;
  currentPoll.finished = true;
  clearTimeout(currentPoll._timeout);
  io.emit('poll_results', getPollResults(currentPoll));
  // emit updated student scores as well
  io.emit('students_update', Array.from(students.entries()).map(([id, s]) => ({ id, name: s.name, score: s.score })));
  currentPoll = null;

  // if there is a queued poll (quiz), start the next one
  if (quizQueue.length > 0) {
    const next = quizQueue.shift();
    const p = createPoll(next);
    if (typeof next.correctIndex === 'number') p.correctIndex = next.correctIndex;
    io.emit('poll_started', {
      id: p.id,
      question: p.question,
      options: p.options.map((o) => o.text),
      remaining: p.duration,
    });
  } else {
    // no more polls queued: quiz finished
    console.log('Quiz finished; emitting quiz_finished with scores');
    io.emit('quiz_finished', {
      students: Array.from(students.entries()).map(([id, s]) => ({ id, name: s.name, score: s.score })),
    });
  }
}

function getPollResults(poll) {
  return {
    id: poll.id,
    question: poll.question,
    options: poll.options.map((o) => ({ text: o.text, votes: o.votes })),
    totalVotes: Object.keys(poll.answers).length,
  };
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('join_student', ({ name }) => {
    // initialize score for student
    students.set(socket.id, { name, score: 0 });
    socket.emit('joined', { id: socket.id });
    io.emit('students_update', Array.from(students.entries()).map(([id, s]) => ({ id, name: s.name, score: s.score })));

    // If a poll is active, inform the student
    if (currentPoll && !currentPoll.finished) {
      const remaining = Math.max(
        0,
        Math.ceil((currentPoll.startedAt + currentPoll.duration * 1000 - Date.now()) / 1000)
      );
      socket.emit('poll_started', {
        id: currentPoll.id,
        question: currentPoll.question,
        options: currentPoll.options.map((o) => o.text),
        remaining,
      });
    }
  });

  socket.on('create_poll', (payload, cb) => {
    // If a poll is active, enqueue this poll so quizzes can be prepared quickly.
    if (currentPoll) {
      quizQueue.push(payload);
      console.log('create_poll: poll active — enqueued payload. queue length=', quizQueue.length);
      io.emit('quiz_queue_update', { length: quizQueue.length });
      return cb && cb({ ok: true, queued: true });
    }

    // payload may include correctIndex to mark the right answer (teacher only)
    const poll = createPoll(payload);
    if (typeof payload.correctIndex === 'number') poll.correctIndex = payload.correctIndex;
    console.log('create_poll: starting poll', poll.id, poll.question);
    io.emit('poll_started', {
      id: poll.id,
      question: poll.question,
      options: poll.options.map((o) => o.text),
      remaining: poll.duration,
    });
    cb && cb({ ok: true, id: poll.id });
  });

  // enqueue a poll into the quiz queue (teacher builds multi-question quiz)
  socket.on('enqueue_poll', (payload, cb) => {
    // payload: { question, options, duration, correctIndex }
    quizQueue.push(payload);
    console.log('enqueue_poll: added to queue, length=', quizQueue.length, 'question=', payload.question);
    io.emit('quiz_queue_update', { length: quizQueue.length });
    cb && cb({ ok: true });
  });

  // start the queued quiz (if no current poll, start next immediately)
  socket.on('start_quiz', (cb) => {
    console.log('start_quiz called; currentPoll=', !!currentPoll, 'queueLength=', quizQueue.length);
    if (!currentPoll && quizQueue.length > 0) {
      const next = quizQueue.shift();
      const p = createPoll(next);
      if (typeof next.correctIndex === 'number') p.correctIndex = next.correctIndex;
      console.log('start_quiz: starting poll', p.id, p.question);
      io.emit('poll_started', {
        id: p.id,
        question: p.question,
        options: p.options.map((o) => o.text),
        remaining: p.duration,
      });
      io.emit('quiz_queue_update', { length: quizQueue.length });
      cb && cb({ ok: true });
    } else {
      // if a poll is already active we still accept start_quiz (it will run after current poll finishes)
      console.log('start_quiz: cannot start immediately; active poll present or empty queue');
      io.emit('quiz_queue_update', { length: quizQueue.length });
      cb && cb({ ok: false, reason: 'no-queue-or-active' });
    }
  });

  socket.on('submit_answer', ({ pollId, optionIndex }, cb) => {
    if (!currentPoll || currentPoll.id !== pollId || currentPoll.finished) {
      return cb && cb({ error: 'No active poll' });
    }
    if (currentPoll.answers[socket.id] !== undefined) {
      return cb && cb({ error: 'Already answered' });
    }
    currentPoll.answers[socket.id] = optionIndex;
    currentPoll.options[optionIndex].votes += 1;

    // update score if poll has a correctIndex
    if (typeof currentPoll.correctIndex === 'number') {
      const student = students.get(socket.id);
      if (student) {
        if (optionIndex === currentPoll.correctIndex) {
          student.score = (student.score || 0) + 1;
          students.set(socket.id, student);
        }
      }
    }

    io.emit('answer_update', {
      totalVotes: Object.keys(currentPoll.answers).length,
    });

    // broadcast updated student scores to teacher and students
    io.emit('students_update', Array.from(students.entries()).map(([id, s]) => ({ id, name: s.name, score: s.score })));

    // if all students answered, finish early
    const expected = Array.from(students.keys()).length;
    if (Object.keys(currentPoll.answers).length >= expected) {
      finishPoll(currentPoll.id);
    }

    cb && cb({ ok: true });
  });

  socket.on('get_current_poll', (cb) => {
    if (!currentPoll) return cb && cb(null);
    const remaining = Math.max(
      0,
      Math.ceil((currentPoll.startedAt + currentPoll.duration * 1000 - Date.now()) / 1000)
    );
    cb && cb({
      id: currentPoll.id,
      question: currentPoll.question,
      options: currentPoll.options.map((o) => o.text),
      remaining,
    });
  });

  socket.on('disconnect', () => {
    students.delete(socket.id);
    io.emit('students_update', Array.from(students.entries()).map(([id, s]) => ({ id, name: s.name, score: s.score })));
    console.log('socket disconnected', socket.id);
  });
});

app.get('/', (req, res) => {
  res.json({ ok: true });
});

// Start server with retry on EADDRINUSE
function startServer(port, attemptsLeft = 5) {
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  // use once so we don't accumulate listeners on retries
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use`);
      if (attemptsLeft > 0) {
        const next = Number(port) + 1;
        console.log(`Trying port ${next}...`);
        setTimeout(() => startServer(next, attemptsLeft - 1), 300);
      } else {
        console.error('No available ports; exiting.');
        process.exit(1);
      }
    } else {
      console.error('Server error', err);
      process.exit(1);
    }
  });
}

startServer(PORT);