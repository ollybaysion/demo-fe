import { forwardOrMock } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/fdc/v1/lines — 설비가 속할 수 있는 라인 목록.
 *
 * 라인은 사람이 타이핑할 값이 아니라 **정해진 목록에서 고르는 값**이다. 진실원은
 * AKG 이고, 스킬 목록(`/skills`)과 같은 길로 온다: FE → BE → AKG. 브라우저가 AKG
 * 주소·자격을 알 필요가 없고, BE 에는 이미 `AkgSkillSource` 가 있어 같은 자리에
 * 붙는다.
 *
 * BACKEND_URL 미설정 시 아래 mock. 백엔드 없이도 "설비 추가 → 라인 고르기"가
 * 화면에서 돌아야 하므로 두는 것이고, **실 목록은 BACKEND_URL 을 붙여서 본다.**
 */
const MOCK_LINES = [
  "L1",
  "L2",
  "L3",
  "L4",
  "M1",
  "M2",
  "P1",
] as const;

export async function GET(request: Request): Promise<Response> {
  return forwardOrMock(request, "/api/fdc/v1/lines", () =>
    Response.json({ lines: [...MOCK_LINES] }),
  );
}
