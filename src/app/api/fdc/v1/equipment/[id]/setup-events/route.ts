import { getEquipmentDetail, getSetupEvents } from "@/demo/equipment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/fdc/v1/equipment/:id/setup-events — 설비별 셋업/설비 변경
 * 이벤트 시점 (post-setup 매칭 anchor 용). API.md §6.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  if (!getEquipmentDetail(id)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return Response.json(getSetupEvents(id));
}
