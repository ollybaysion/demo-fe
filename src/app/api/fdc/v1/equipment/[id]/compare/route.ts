import {
  COMPARE_RECIPES,
  COMPARE_WINDOWS,
  type CompareWindowDays,
  getCompareData,
  getEquipmentDetail,
} from "@/demo/equipment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/fdc/v1/equipment/:id/compare — 1:1 비교 (post-setup 모드).
 *
 * Query params:
 *   - peerId       (필수)
 *   - recipe       (필수, 화이트리스트)
 *   - window       (옵션, 기본 7) — 1 / 7 / 30
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const url = new URL(request.url);
  const peerId = url.searchParams.get("peerId");
  const recipe = url.searchParams.get("recipe") ?? COMPARE_RECIPES[0];
  const windowParam = Number(url.searchParams.get("window") ?? "7");

  if (!getEquipmentDetail(id)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  if (!peerId || !getEquipmentDetail(peerId)) {
    return Response.json(
      { error: "peer_not_found", peerId },
      { status: 400 },
    );
  }
  if (!(COMPARE_RECIPES as readonly string[]).includes(recipe)) {
    return Response.json(
      { error: "unknown_recipe", recipe, allowed: COMPARE_RECIPES },
      { status: 400 },
    );
  }
  if (!COMPARE_WINDOWS.includes(windowParam as CompareWindowDays)) {
    return Response.json(
      { error: "unknown_window", window: windowParam, allowed: COMPARE_WINDOWS },
      { status: 400 },
    );
  }

  const data = getCompareData(
    id,
    peerId,
    recipe,
    windowParam as CompareWindowDays,
  );
  return Response.json(data);
}
