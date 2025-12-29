type Props = {
  role: "student" | "teacher" | null;
  setRole: (r: "student" | "teacher") => void;
  onContinue: () => void;
};

export default function RoleSelect({ role, setRole, onContinue }: Props) {
  return (
    <div className="container">
      <div className="badge">⚡ Intervue Poll</div>

      <h1>
        Welcome to the <b>Live Polling System</b>
      </h1>
      <p style={{ color: "#6b7280" }}>
        Please select the role that best describes you
      </p>

      <div style={{ display: "flex", gap: 24, marginTop: 40 }}>
        <div
          className={`card role-card ${role === "student" ? "active" : ""}`}
          onClick={() => setRole("student")}
        >
          <h3>I’m a Student</h3>
          <p>Answer live questions instantly</p>
        </div>

        <div
          className={`card role-card ${role === "teacher" ? "active" : ""}`}
          onClick={() => setRole("teacher")}
        >
          <h3>I’m a Teacher</h3>
          <p>Create polls & monitor responses</p>
        </div>
      </div>

      <button
        className="primary-btn"
        style={{ marginTop: 40 }}
        onClick={onContinue}
      >
        Continue
      </button>
    </div>
  );
}
