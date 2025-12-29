import { useState } from "react";
import "./styles/main.css";

import RoleSelect from "./components/RoleSelect";
import StudentPoll from "./components/StudentPoll";
import TeacherPanel from "./components/TeacherPanel";

export default function App() {
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const [screen, setScreen] = useState<"role" | "student" | "teacher">("role");

  const handleContinue = () => {
    if (!role) return alert("Please select a role");

    if (role === "student") setScreen("student");
    if (role === "teacher") setScreen("teacher");
  };

  if (screen === "student") return <StudentPoll />;
  if (screen === "teacher") return <TeacherPanel />;

  return (
    <RoleSelect
      role={role}
      setRole={setRole}
      onContinue={handleContinue}
    />
  );
}
