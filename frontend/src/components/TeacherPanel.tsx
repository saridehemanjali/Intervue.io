import { useState, useEffect } from "react";
import { useSocket } from "../hooks/useSocket";
import { Socket } from "socket.io-client";

const inputStyle = {
  width: "100%",
  padding: 10,
  marginTop: 8,
  marginBottom: 12,
  borderRadius: 8,
  border: "1px solid #ddd",
};

export default function TeacherPanel() {
  const socket: Socket | null = useSocket();

  const [q, setQ] = useState("");
  const [o1, setO1] = useState("");
  const [o2, setO2] = useState("");

  const [responses, setResponses] = useState<
    { studentName?: string; optionIndex: number }[]
  >([]);

  // Listen for poll results from server
  useEffect(() => {
    if (!socket) return;

    socket.on("poll_results", (data: any) => {
      setResponses(data);
    });

    return () => {
      socket.off("poll_results");
    };
  }, [socket]);

  const createPoll = () => {
    if (!socket) return;

    if (!q || !o1 || !o2) {
      alert("Please fill all fields");
      return;
    }

    // Emit poll to students
    socket.emit("create_poll", {
      question: q,
      options: [o1, o2],
      duration: 60,
    });

    // Clear form
    setQ("");
    setO1("");
    setO2("");
    setResponses([]); // clear old responses

    // After 60 seconds, ask server for results
    setTimeout(() => {
      socket.emit("poll_end_request");
    }, 60000); // 60s
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "60px auto",
        padding: 24,
        borderRadius: 14,
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        background: "#fff",
      }}
    >
      <h2 style={{ marginBottom: 10 }}>Let’s Get Started</h2>
      <p style={{ color: "#666", marginBottom: 20 }}>
        Create a live poll and monitor student responses in real-time.
      </p>

      {/* Question */}
      <label style={{ fontWeight: 500 }}>Enter your question</label>
      <textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Type your question here..."
        maxLength={100}
        style={{
          width: "100%",
          marginTop: 8,
          marginBottom: 20,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #ddd",
        }}
      />

      {/* Options */}
      <label style={{ fontWeight: 500 }}>Options</label>

      <input
        placeholder="Option 1"
        value={o1}
        onChange={(e) => setO1(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="Option 2"
        value={o2}
        onChange={(e) => setO2(e.target.value)}
        style={inputStyle}
      />

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#666" }}>⏱ Duration: 60 seconds</span>

        <button
          onClick={createPoll}
          style={{
            padding: "10px 20px",
            borderRadius: 20,
            border: "none",
            background: "#6c63ff",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Ask Question
        </button>
      </div>

      {/* ----- Student Responses ----- */}
      {responses.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h3>Student Responses</h3>
          {responses.map((r, i) => (
            <div
              key={i}
              style={{
                padding: 10,
                marginBottom: 8,
                borderRadius: 8,
                background: "#f5f5f5",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>{r.studentName || `Student ${i + 1}`}</span>
              <span>Option {r.optionIndex + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
