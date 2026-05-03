import { getEquipmentDetail } from "@/demo/equipment";
import { forwardOrMock } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/fdc/v1/equipment/:id — 설비 상세.
 *
 * BACKEND_URL env 설정 시 그쪽으로 forward, 아니면 mock 응답.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return forwardOrMock(
    request,
    `/api/fdc/v1/equipment/${encodeURIComponent(id)}`,
    () => {
      const detail = getEquipmentDetail(id);
      if (!detail) {
        return Response.json({ error: "not_found" }, { status: 404 });
      }
      return Response.json(detail);
    },
  );
}
