export default function PollQuestion({ question }: any) {
  return (
    <div className="poll-box">
      <div className="poll-header">{question.text}</div>

      {question.options.map((opt: any, idx: number) => (
        <div key={idx} className="poll-option">
          <span>{opt.text}</span>

          <div className="progress">
            <div
              className="progress-fill"
              style={{ width: `${opt.percent}%` }}
            />
          </div>

          <b>{opt.percent}%</b>
        </div>
      ))}
    </div>
  );
}
