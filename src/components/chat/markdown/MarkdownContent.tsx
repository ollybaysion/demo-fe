"use client";

import { type ReactNode, useState } from "react";
import { Highlight, themes, type Language } from "prism-react-renderer";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

/**
 * 어시스턴트 메시지 본문을 마크다운으로 렌더링 (#31).
 *
 * - GFM (테이블/취소선/체크리스트 등) 지원
 * - HTML 직접 렌더링은 rehype-sanitize 로 차단 — `dangerouslySetInnerHTML` 미사용
 * - 코드 펜스: prism-react-renderer 로 syntax highlight + 우상단 [복사]
 * - 외부 링크는 새 탭 + noopener
 */
type Props = {
  content: string;
};

export function MarkdownContent({ content }: Props) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Component overrides — 디자인 토큰에 맞춘 스타일
// ────────────────────────────────────────────────────────────────────

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-title-lg font-medium text-brand-ink mt-md mb-xs first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-title-md font-medium text-brand-ink mt-md mb-xs first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-title-sm font-medium text-brand-ink mt-sm mb-xxs first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-body-md font-medium text-brand-ink mt-sm mb-xxs first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="my-xs first:mt-0 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-lg my-xs space-y-xxs">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-lg my-xs space-y-xxs">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  a: ({ href, children }) => {
    const isExternal = !!href && /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="text-brand-primary underline underline-offset-2 hover:text-brand-primary-active focus:outline-none focus:ring-2 focus:ring-brand-primary/15 rounded-xs"
      >
        {children}
      </a>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-brand-hairline pl-md italic text-brand-muted my-xs">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-md border-brand-hairline" />,
  strong: ({ children }) => (
    <strong className="font-medium text-brand-ink">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => (
    <del className="text-brand-muted">{children}</del>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-sm">
      <table className="text-body-sm border-collapse w-full">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-brand-hairline">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="text-left px-sm py-xs font-medium text-brand-ink whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-sm py-xs border-b border-brand-hairline-soft text-brand-ink align-top">
      {children}
    </td>
  ),
  // pre 는 코드 블럭의 wrapper — 우리 CodeBlock 이 자체 pre 를 그리므로 그대로 통과.
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const text = String(children ?? "");
    const match = /language-([\w-]+)/.exec(className ?? "");
    if (match) {
      return (
        <CodeBlock language={match[1]} code={text.replace(/\n$/, "")} />
      );
    }
    return <InlineCode>{children}</InlineCode>;
  },
};

// ────────────────────────────────────────────────────────────────────
// Inline code
// ────────────────────────────────────────────────────────────────────

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="px-xxs rounded-xs bg-brand-ink-translucent-04 text-brand-ink font-mono text-[0.92em]">
      {children}
    </code>
  );
}

// ────────────────────────────────────────────────────────────────────
// Code block — language label + 복사 버튼 + Prism syntax highlight
// ────────────────────────────────────────────────────────────────────

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [justCopied, setJustCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch {
      // 권한 거부 / insecure context — 사용자가 직접 선택해 복사.
    }
  };

  return (
    <div className="rounded-md bg-brand-surface-dark text-brand-on-dark my-sm overflow-hidden">
      <div className="flex items-center justify-between px-md py-xxs text-caption text-brand-on-dark-soft border-b border-white/5">
        <span className="font-mono">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={justCopied ? "복사됨" : "코드 복사"}
          className="inline-flex items-center gap-xxs px-xs py-xxs rounded-sm hover:bg-white/5 hover:text-brand-on-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-colors"
        >
          {justCopied ? "복사됨" : "복사"}
        </button>
      </div>
      <Highlight
        code={code}
        language={language as Language}
        theme={themes.vsDark}
      >
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} px-md py-sm overflow-x-auto text-body-sm font-mono`}
            style={style}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
