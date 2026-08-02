import { describe, expect, it } from "vitest";
import {
  IMAGE_MAX_BYTES,
  imageRejectReason,
  planClipboardIngest,
  splitDroppedFiles,
} from "@/lib/clipboard-ingest";

/**
 * 여기서 지키는 건 **붙여넣기 한 번의 판정**이다. 브라우저가 클립보드에 무엇을
 * 싣는지는 손으로 재현하기 번거롭고 앱을 띄워야 보이는데, 판정만 떼어 두면
 * 위험한 조합(표 + 비트맵이 함께 실리는 스프레드시트 복사)을 여기서 잡는다.
 */

function clipboard(opts: {
  text?: string;
  files?: Array<{ type: string; name?: string; kind?: string }>;
}) {
  const items = (opts.files ?? []).map((f) => ({
    kind: f.kind ?? "file",
    type: f.type,
    getAsFile: () =>
      ({ name: f.name ?? "clip", type: f.type, size: 10 }) as unknown as File,
  }));
  return {
    getData: () => opts.text ?? "",
    items,
  };
}

describe("planClipboardIngest", () => {
  it("스크린샷만 있으면 그림으로 받는다", () => {
    const plan = planClipboardIngest(
      clipboard({ files: [{ type: "image/png" }] }),
    );
    expect(plan.kind).toBe("images");
    expect(plan.kind === "images" && plan.files).toHaveLength(1);
  });

  it("표를 복사하면 그림이 함께 실려 있어도 텍스트로 받는다", () => {
    // 스프레드시트·SQL 도구는 셀 범위를 복사할 때 비트맵을 같이 싣는다.
    // 그림을 먼저 보면 데이터 등록이 그림 등록으로 뒤집힌다.
    const plan = planClipboardIngest(
      clipboard({
        text: "SENSOR_ID\tVALUE\nS-1\t12",
        files: [{ type: "image/png" }],
      }),
    );
    expect(plan).toEqual({
      kind: "text",
      text: "SENSOR_ID\tVALUE\nS-1\t12",
    });
  });

  it("공백뿐인 텍스트는 텍스트로 치지 않는다", () => {
    const plan = planClipboardIngest(
      clipboard({ text: "   \n ", files: [{ type: "image/jpeg" }] }),
    );
    expect(plan.kind).toBe("images");
  });

  it("파일이 아닌 항목(text/html 등)은 그림으로 세지 않는다", () => {
    const plan = planClipboardIngest(
      clipboard({ files: [{ kind: "string", type: "image/png" }] }),
    );
    expect(plan).toEqual({ kind: "none" });
  });

  it("그림이 아닌 파일은 그림 경로로 보내지 않는다", () => {
    const plan = planClipboardIngest(
      clipboard({ files: [{ type: "application/pdf" }] }),
    );
    expect(plan).toEqual({ kind: "none" });
  });

  it("주소 한 줄은 링크로 받는다", () => {
    expect(
      planClipboardIngest(clipboard({ text: "https://wiki.example.com/fdc/1" })),
    ).toEqual({ kind: "link", url: "https://wiki.example.com/fdc/1" });
    // 앞뒤 공백은 복사에 딸려 오는 것이라 벗긴다.
    expect(planClipboardIngest(clipboard({ text: "  http://a.b/c \n" }))).toEqual(
      { kind: "link", url: "http://a.b/c" },
    );
  });

  it("주소가 섞인 여러 줄은 표로 받는다 — 조회 결과일 수 있다", () => {
    const text = "URL\thttps://a.example.com\nNAME\tA";
    expect(planClipboardIngest(clipboard({ text }))).toEqual({
      kind: "text",
      text,
    });
  });

  it("주소처럼 생겼지만 아닌 것은 표로 보낸다", () => {
    // 스킴이 없으면 사내 경로·식별자일 수 있다.
    expect(planClipboardIngest(clipboard({ text: "wiki.example.com" })).kind).toBe(
      "text",
    );
    // 호스트가 없는 주소는 열 수 없다.
    expect(planClipboardIngest(clipboard({ text: "http://" })).kind).toBe("text");
  });

  it("빈 클립보드·클립보드 없음은 아무것도 하지 않는다", () => {
    expect(planClipboardIngest(clipboard({}))).toEqual({ kind: "none" });
    expect(planClipboardIngest(null)).toEqual({ kind: "none" });
  });

  it("텍스트를 읽다 던지는 브라우저에서도 그림 경로는 산다", () => {
    const plan = planClipboardIngest({
      getData: () => {
        throw new Error("blocked");
      },
      items: [
        {
          kind: "file",
          type: "image/png",
          getAsFile: () =>
            ({ name: "a.png", type: "image/png", size: 1 }) as unknown as File,
        },
      ],
    });
    expect(plan.kind).toBe("images");
  });
});

describe("splitDroppedFiles", () => {
  it("그림과 그 밖(CSV 등)을 가른다", () => {
    const { images, others } = splitDroppedFiles([
      { name: "cap.png", type: "image/png", size: 1 },
      { name: "rows.csv", type: "text/csv", size: 2 },
      { name: "no-ext", type: "", size: 3 },
    ]);
    expect(images.map((f) => f.name)).toEqual(["cap.png"]);
    expect(others.map((f) => f.name)).toEqual(["rows.csv", "no-ext"]);
  });
});

describe("imageRejectReason", () => {
  it("받는 형식은 통과시킨다", () => {
    expect(
      imageRejectReason({ name: "a.png", type: "image/png", size: 1024 }),
    ).toBeNull();
  });

  it("목록에 없는 형식은 이유를 돌려준다", () => {
    expect(
      imageRejectReason({ name: "a.svg", type: "image/svg+xml", size: 10 }),
    ).toMatch(/형식/);
    // 형식을 모르는 파일도 조용히 버리지 않는다.
    expect(imageRejectReason({ name: "a", type: "", size: 10 })).toMatch(
      /알 수 없음/,
    );
  });

  it("상한을 넘는 그림은 이유를 돌려준다", () => {
    expect(
      imageRejectReason({
        name: "big.png",
        type: "image/png",
        size: IMAGE_MAX_BYTES + 1,
      }),
    ).toMatch(/너무 큽니다/);
  });
});
