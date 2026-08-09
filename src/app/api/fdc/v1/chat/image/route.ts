import { forwardOrMock } from "@/lib/backend";
import { logger } from "@/lib/logger";
import type { BrowseGroup, ScreenOption } from "@/lib/types";

/**
 * `POST /api/fdc/v1/chat/image` — 캡처 화면 분류 인렛(BE 계약 = fdc-agent-be-spring
 * #63, FE 카드 = #189). 동기 JSON(LLM 1회, SSE 아님). `BACKEND_URL` 설정 시 실 BE 로
 * forward, 미설정 시 아래 mock.
 *
 * BE `classify()` 와 같은 규약: **항상 200** — 실패·후보 전멸이어도 `candidates: []`
 * 로 응답하고 `browse` 는 항상 카탈로그 전체로 채운다. FE 는 네트워크 실패(요청 자체가
 * 안 갔거나 응답이 아예 안 옴)만 별도 처리한다.
 */

const log = logger.child({ route: "chat/image" });

export const runtime = "nodejs";

type ClassifyBody = { image?: string };

const MOCK_BROWSE: BrowseGroup[] = [
  {
    group: "FDC Monitor",
    options: [
      {
        value: "fdc-monitor-history",
        label: "센서값 이력 조회",
        caption: "FDC Monitor › 이력조회",
      },
      {
        value: "fdc-monitor-trend",
        label: "트렌드 조회",
        caption: "FDC Monitor › 트렌드",
      },
      {
        value: "fdc-monitor-alarm",
        label: "알람 이력",
        caption: "FDC Monitor › 알람",
      },
    ],
  },
  {
    group: "SPC",
    options: [
      {
        value: "spc-control-chart",
        label: "관리도 조회",
        caption: "SPC › 관리도",
      },
      {
        value: "spc-spec-violation",
        label: "규격 이탈 목록",
        caption: "SPC › 이탈목록",
      },
    ],
  },
];

// 고정 후보 3개 — FDC Monitor 그룹 전체를 순위 그대로.
const MOCK_CANDIDATES: ScreenOption[] = MOCK_BROWSE[0].options;

export async function POST(request: Request): Promise<Response> {
  return forwardOrMock(request, "/api/fdc/v1/chat/image", () =>
    mockClassify(request),
  );
}

async function mockClassify(request: Request): Promise<Response> {
  let body: ClassifyBody = {};
  try {
    body = (await request.json()) as ClassifyBody;
  } catch {
    return Response.json({ error: "body_required" }, { status: 400 });
  }
  if (!body.image || !body.image.startsWith("data:image/")) {
    return Response.json({ error: "image_required" }, { status: 400 });
  }

  log.info({}, "chat/image mock classify");
  return Response.json({ candidates: MOCK_CANDIDATES, browse: MOCK_BROWSE });
}
