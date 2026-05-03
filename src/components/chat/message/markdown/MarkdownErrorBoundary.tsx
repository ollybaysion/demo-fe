"use client";

import { Component, type ReactNode } from "react";

/**
 * 마크다운 렌더링 ErrorBoundary.
 *
 * react-markdown / remark-gfm / rehype-sanitize / prism-react-renderer
 * 중 어디서든 throw 가 발생하면 그 메시지의 본문만 plain text 로 fallback.
 * 다른 메시지나 앱 트리 전체엔 영향 없음.
 *
 * React 의 Error Boundary 는 클래스 컴포넌트로만 구현 가능
 * (`getDerivedStateFromError` / `componentDidCatch` 는 클래스 전용).
 */

type Props = {
  /** 에러 시 plain text 로 노출할 원본 마크다운 문자열. */
  fallbackText: string;
  children: ReactNode;
};

type State = { hasError: boolean };

export class MarkdownErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    // production 에서는 사용자 메시지 본문이 stack trace 에 일부
    // 포함될 가능성이 있어 error 객체 전체를 dev tools 에 노출하지 않음.
    // 메시지 한 줄(=라이브러리 자체 throw 메시지) 만 남김. 외부 에러
    // 추적기(Sentry 등) 도입 시에는 별도 sink 로 송출.
    if (process.env.NODE_ENV !== "production") {
      console.error("[MarkdownErrorBoundary] markdown render failed:", error);
    } else {
      const message = error instanceof Error ? error.message : "unknown";
      console.error(
        `[MarkdownErrorBoundary] markdown render failed: ${message}`,
      );
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="whitespace-pre-wrap font-sans text-chat-message-body text-brand-ink">
          {this.props.fallbackText}
        </div>
      );
    }
    return this.props.children;
  }
}
