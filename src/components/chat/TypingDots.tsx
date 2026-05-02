export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-xxs" aria-label="응답 생성 중">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          aria-hidden
          className="inline-block w-1.5 h-1.5 rounded-full bg-brand-muted-soft animate-typing-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
