import type { ClassifyImageResponse } from "@/lib/types";

/**
 * `POST /api/fdc/v1/chat/image` 클라이언트 — 캡처 한 장을 보내 화면 후보를 받는다.
 * 동기 JSON(LLM 1회, SSE 아님). 항상 200 이므로 실패는 네트워크·파싱 예외뿐이다
 * (호출부가 캡처 항목을 `failed` 로 내리고 재시도 버튼을 낸다).
 */
export async function classifyCapture(
  dataUrl: string,
): Promise<ClassifyImageResponse> {
  const res = await fetch("/api/fdc/v1/chat/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: dataUrl }),
  });
  if (!res.ok) throw new Error(`chat/image ${res.status}`);
  return (await res.json()) as ClassifyImageResponse;
}
