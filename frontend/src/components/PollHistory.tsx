import { useEffect, useState } from "react";
import axios, { AxiosResponse } from "axios";

/* ---------- Types ---------- */
interface Poll {
  _id: string;
  question: string;
}

interface PollResult {
  _id: string;      // option name
  count: number;
}

interface PollHistoryItem {
  poll: Poll;
  results: PollResult[];
}

/* ---------- Component ---------- */
export default function PollHistory() {
  const [history, setHistory] = useState<PollHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    axios
      .get<PollHistoryItem[]>("/api/polls/history")
      .then((res: AxiosResponse<PollHistoryItem[]>) => {
        setHistory(res.data);
      })
      .catch(() => {
        alert("Failed to load poll history");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading poll history...</p>;
  }

  return (
    <div>
      <h2>Poll History</h2>

      {history.length === 0 && <p>No previous polls found.</p>}

      {history.map((item) => (
        <div key={item.poll._id} style={{ marginBottom: "16px" }}>
          <h4>{item.poll.question}</h4>

          {item.results.length === 0 && <p>No votes recorded</p>}

          {item.results.map((result) => (
            <p key={result._id}>
              {result._id}: {result.count}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
