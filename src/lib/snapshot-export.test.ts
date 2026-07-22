import { describe, expect, it } from "vitest";
import {
  buildCsv,
  buildFullViewHtml,
  csvFileName,
} from "@/lib/snapshot-export";

describe("buildCsv", () => {
  it("BOM + CRLF — 사내 Excel 이 UTF-8 한글을 제대로 열게", () => {
    const out = buildCsv(["A"], [["1"]]);
    expect(out.startsWith("﻿")).toBe(true);
    expect(out).toBe("﻿A\r\n1\r\n");
  });

  it("쉼표·따옴표·개행이 든 셀은 감싸고, 따옴표는 두 번 쓴다", () => {
    const out = buildCsv(["A", "B"], [['말,함', '그는 "왜"라고\n물었다']]);
    expect(out).toContain('"말,함","그는 ""왜""라고\n물었다"');
  });

  it("NULL 은 빈 칸으로 접는다 — CSV 에는 NULL 표기가 없다", () => {
    const out = buildCsv(["A", "B"], [[null, "x"]]);
    expect(out).toContain("\r\n,x\r\n");
  });
});

describe("csvFileName", () => {
  it("파일명 불가 문자를 접는다", () => {
    expect(csvFileName("센서/목록: 최신?")).toBe("센서_목록_ 최신_.csv");
  });

  it("전부 접혀 비면 기본 이름", () => {
    expect(csvFileName("///")).toBe("___.csv");
    expect(csvFileName("   ")).toBe("snapshot.csv");
  });
});

describe("buildFullViewHtml", () => {
  const snap = {
    label: "센서 <목록>",
    capturedAt: "2026-07-23T00:00:00.000Z",
    columns: ["A&B"],
    rows: [["<script>"], [null]],
  };

  it("셀·라벨·컬럼을 HTML 이스케이프한다", () => {
    const html = buildFullViewHtml(snap);
    expect(html).toContain("센서 &lt;목록&gt;");
    expect(html).toContain("A&amp;B");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("NULL 은 빈 칸과 구별해 표기한다", () => {
    expect(buildFullViewHtml(snap)).toContain('<td class="null">NULL</td>');
  });

  it("행 수를 머리말에 싣는다", () => {
    expect(buildFullViewHtml(snap)).toContain("1열 · 2행");
  });
});
