import { getEquipmentDetail, getPeers } from "@/demo/equipment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/fdc/v1/equipment/:id/peers — 같은 model 의 다른 설비 목록.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  if (!getEquipmentDetail(id)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return Response.json(getPeers(id));
}
