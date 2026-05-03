import { getEquipmentDetail, getPeers } from "@/demo/equipment";
import { forwardOrMock } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/fdc/v1/equipment/:id/peers — 같은 model 의 다른 설비 목록.
 *
 * BACKEND_URL env 설정 시 forward, 아니면 mock.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return forwardOrMock(
    request,
    `/api/fdc/v1/equipment/${encodeURIComponent(id)}/peers`,
    () => {
      if (!getEquipmentDetail(id)) {
        return Response.json({ error: "not_found" }, { status: 404 });
      }
      return Response.json(getPeers(id));
    },
  );
}
