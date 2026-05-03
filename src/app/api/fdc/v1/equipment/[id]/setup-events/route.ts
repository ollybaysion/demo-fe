import { getEquipmentDetail, getSetupEvents } from "@/demo/equipment";
import { forwardOrMock } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/fdc/v1/equipment/:id/setup-events — 셋업 이벤트 list
 * (post-setup 매칭 anchor 용). BACKEND_URL env 설정 시 forward.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return forwardOrMock(
    request,
    `/api/fdc/v1/equipment/${encodeURIComponent(id)}/setup-events`,
    () => {
      if (!getEquipmentDetail(id)) {
        return Response.json({ error: "not_found" }, { status: 404 });
      }
      return Response.json(getSetupEvents(id));
    },
  );
}
