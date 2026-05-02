export function ChatEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-section">
      <h2 className="font-display text-display-md text-brand-ink">
        무엇을 도와드릴까요?
      </h2>
      <p className="mt-md text-body-md text-brand-muted">
        아래 입력창에 질문을 입력하세요.
      </p>
    </div>
  );
}
