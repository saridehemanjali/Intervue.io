import { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import { Socket } from "socket.io-client";

export default function StudentPoll() {
  const socket: Socket | null = useSocket();

  const [poll, setPoll] = useState<any>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [voted, setVoted] = useState(false);

  // Stable studentId
  let studentId = sessionStorage.getItem("id");
  if (!studentId) {
    studentId = Math.random().toString(36).substring(2);
    sessionStorage.setItem("id", studentId);
  }

  // ⏱ CLIENT-SIDE TIMER
  useEffect(() => {
    if (remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining]);

  useEffect(() => {
    if (!socket) return;

    socket.on("poll_started", (data) => {
      setPoll(data);
      setRemaining(60); // 👈 START FROM 60
      setVoted(false);
    });

    socket.on("poll_ended", (finalPoll) => {
      setPoll(finalPoll);
      setRemaining(0);
    });

    return () => {
      socket.off("poll_started");
      socket.off("poll_ended");
    };
  }, [socket]);

  const vote = (i: number) => {
    if (!socket || !poll || voted || remaining === 0) return;

    socket.emit("vote", {
      pollId: poll.id,
      studentId,
      optionIndex: i,
    });

    setVoted(true);
  };

  if (!poll)
    return (
      <div style={{ textAlign: "center", marginTop: 120 }}>
        <h3>Wait for the teacher to ask a new question…</h3>
      </div>
    );

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "80px auto",
        padding: 24,
        borderRadius: 14,
        background: "#fff",
        boxShadow: "0 8px 28px rgba(0,0,0,0.1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0 }}>Question</h3>
        <span
          style={{
            color: remaining <= 5 ? "#ff4d4f" : "#6c63ff",
            fontWeight: 700,
          }}
        >
          ⏱ {remaining}s
        </span>
      </div>

      <p style={{ marginBottom: 24, fontSize: 16 }}>{poll.question}</p>

      {/* Options */}
      {poll.options.map((o: string, i: number) => (
        <button
          key={i}
          onClick={() => vote(i)}
          disabled={voted || remaining === 0}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "14px 16px",
            marginBottom: 12,
            borderRadius: 10,
            border: "1px solid #ddd",
            background: voted ? "#f5f5f5" : "#fafafa",
            cursor: voted ? "not-allowed" : "pointer",
            fontSize: 15,
          }}
        >
          {o}
        </button>
      ))}

      {voted && (
        <p style={{ textAlign: "center", marginTop: 16, color: "#6c63ff" }}>
          ✅ Response submitted
        </p>
      )}

      {remaining === 0 && (
        <p style={{ textAlign: "center", marginTop: 16, color: "#ff4d4f" }}>
          ⏱ Time’s up
        </p>
      )}
    </div>
  );
}
