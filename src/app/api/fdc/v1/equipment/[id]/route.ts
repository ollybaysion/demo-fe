import { getEquipmentDetail } from "@/demo/equipment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/fdc/v1/equipment/:id — 설비 상세.
 *
 * 현재는 `src/demo/equipment.ts` 의 mock 데이터를 그대로 wrap. 실제
 * 백엔드 연결 시 이 핸들러 안만 forward 로 교체하면 호출부는 무수정.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const detail = getEquipmentDetail(id);
  if (!detail) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return Response.json(detail);
}
