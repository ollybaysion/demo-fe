"use client";

import { Component, type ReactNode } from "react";

/**
 * 마크다운 렌더링 ErrorBoundary (#39).
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
    // 콘솔 로그만 — 사용자 알림(토스트 등) 은 별도 이슈.
    console.error("[MarkdownErrorBoundary] markdown render failed:", error);
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
