import type { Message } from "@/lib/types";
import { StreamingCursor } from "./StreamingCursor";

type Props = {
  message: Message;
  streaming?: boolean;
};

export function ChatMessage({ message, streaming }: Props) {
  if (message.role === "error") {
    return (
      <li className="flex justify-start">
        <div
          role="alert"
          className="max-w-[85%] rounded-lg px-md py-sm bg-brand-error-soft text-brand-error font-sans text-chat-message-body"
        >
          {message.content}
        </div>
      </li>
    );
  }

  const isUser = message.role === "user";
  return (
    <li className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        aria-busy={streaming || undefined}
        className={`max-w-[85%] rounded-lg px-md py-sm font-sans text-chat-message-body whitespace-pre-wrap ${
          isUser
            ? "bg-brand-primary text-brand-on-primary"
            : "bg-brand-surface-card text-brand-ink"
        }`}
      >
        {message.content}
        {streaming && <StreamingCursor />}
      </div>
    </li>
  );
}
