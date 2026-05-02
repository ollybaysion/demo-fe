export default function Home() {
  return (
    <main className="min-h-dvh bg-brand-canvas text-brand-ink font-sans">
      <div className="mx-auto max-w-chat-narrow px-lg py-section space-y-xl">
        <header className="space-y-md">
          <h1 className="font-display text-display-xl">FDC Agent</h1>
          <p className="text-body-md text-brand-body">
            Tailwind v4 @theme token verification — replace with chat UI in #5.
          </p>
        </header>

        <section className="space-y-md">
          <h2 className="font-display text-display-md">Color tokens</h2>
          <div className="grid grid-cols-3 gap-md">
            <Swatch name="canvas" className="bg-brand-canvas border border-brand-hairline text-brand-ink" />
            <Swatch name="primary" className="bg-brand-primary text-brand-on-primary" />
            <Swatch name="primary/15" className="bg-brand-primary/15 text-brand-ink" />
            <Swatch name="surface-card" className="bg-brand-surface-card text-brand-ink" />
            <Swatch name="surface-dark" className="bg-brand-surface-dark text-brand-on-dark" />
            <Swatch name="error-soft" className="bg-brand-error-soft text-brand-error" />
          </div>
        </section>

        <section className="space-y-md">
          <h2 className="font-display text-display-md">Typography tokens</h2>
          <div className="space-y-xs">
            <p className="font-display text-display-xl">display-xl 64/1.05/-1.5</p>
            <p className="font-display text-display-md">display-md 36/1.15/-0.5</p>
            <p className="font-sans text-title-lg">title-lg 22/1.3/0/500</p>
            <p className="font-sans text-body-md">body-md 16/1.55 — Inter humanist sans body. 한글 fallback 검증은 #4 후.</p>
            <p className="font-sans text-chat-message-body">chat-message-body 16/1.65 — looser leading for sustained reading.</p>
            <p className="font-mono text-inline-code">inline-code 14 mono</p>
            <p className="font-sans text-caption text-brand-muted">caption 13/500 muted</p>
          </div>
        </section>

        <section className="space-y-md">
          <h2 className="font-display text-display-md">Radius + spacing</h2>
          <div className="flex gap-md flex-wrap">
            <Tile className="rounded-xs">xs 4</Tile>
            <Tile className="rounded-sm">sm 6</Tile>
            <Tile className="rounded-md">md 8</Tile>
            <Tile className="rounded-lg">lg 12</Tile>
            <Tile className="rounded-xl">xl 16</Tile>
            <Tile className="rounded-pill">pill</Tile>
          </div>
        </section>

        <section className="space-y-md">
          <h2 className="font-display text-display-md">Animations</h2>
          <div className="flex items-center gap-lg">
            <span className="text-body-md">cursor:</span>
            <span
              aria-hidden
              className="inline-block w-[2px] h-[1.1em] align-middle bg-brand-primary animate-cursor-blink"
            />
            <span className="text-body-md ml-md">typing dots:</span>
            <span className="inline-flex gap-xxs">
              <Dot delay="0ms" />
              <Dot delay="150ms" />
              <Dot delay="300ms" />
            </span>
          </div>
        </section>

        <section className="space-y-md">
          <h2 className="font-display text-display-md">Bubble preview</h2>
          <ol className="space-y-md">
            <li className="flex justify-end">
              <div className="max-w-[85%] rounded-lg px-md py-sm bg-brand-primary text-brand-on-primary text-chat-message-body font-sans">
                User message — coral fill, right-aligned.
              </div>
            </li>
            <li className="flex justify-start">
              <div className="max-w-[85%] rounded-lg px-md py-sm bg-brand-surface-card text-brand-ink text-chat-message-body font-sans">
                Assistant message — surface-card, left-aligned. The trailing
                <span className="ml-0.5 inline-block w-[2px] h-[1.1em] align-middle bg-brand-primary animate-cursor-blink" />
              </div>
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className={`rounded-md p-md text-body-sm font-sans ${className}`}>
      {name}
    </div>
  );
}

function Tile({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <div className={`bg-brand-surface-card text-brand-ink text-body-sm font-sans px-md py-sm ${className}`}>
      {children}
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-brand-muted-soft animate-typing-bounce"
      style={{ animationDelay: delay }}
    />
  );
}
