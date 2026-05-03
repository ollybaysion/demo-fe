"use client";

import { useEffect, useRef, useState } from "react";
import { readJson, writeJson } from "@/lib/storage";
import { applyTheme, type Theme } from "@/lib/theme";

/**
 * 설정 화면 (#12 + #77 테마 확장).
 *
 * 테마는 light / dark / sepia / cool-gray / high-contrast / system 6종.
 * 폰트 / 언어 / 모델 은 v1 UI 자리 — 실제 동작은 후속 PR.
 */

export type ThemeOption = Theme;
export type FontSizeOption = "sm" | "md" | "lg";
export type ModelOption = "default";

export type Settings = {
  theme: ThemeOption;
  fontSize: FontSizeOption;
  /** 현재 ko 만 지원. 다국어는 별도 이슈. */
  language: "ko";
  model: ModelOption;
};

const SETTINGS_KEY = "fdc-fe.settings.v1";

const DEFAULT_SETTINGS: Settings = {
  theme: "cool-gray",
  fontSize: "md",
  language: "ko",
  model: "default",
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SettingsModal({ open, onClose }: Props) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // 첫 마운트 시 localStorage 에서 읽음. SSR/hydration 일관성을 위해
  // 초기 렌더는 default 로 두고 useEffect 에서 클라이언트 값으로 교체.
  useEffect(() => {
    const stored = readJson<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(stored);
    applyTheme(stored.theme);
  }, []);

  // 변경 즉시 저장 (별도 [저장] 버튼 없음 — 도움말 / 채팅 등 다른
  // 영역과 동일한 auto-persist 정책).
  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      writeJson(SETTINGS_KEY, next);
      if (key === "theme") applyTheme(value as Theme);
      return next;
    });
  }

  // ESC 닫기 + 열렸을 때 X 버튼에 포커스.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="설정"
      className="fixed inset-0 z-50 flex items-center justify-center p-md"
    >
      <div
        className="absolute inset-0 bg-brand-ink/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-[28rem] max-h-[85vh] bg-brand-canvas rounded-lg shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-md py-sm border-b border-brand-hairline">
          <h2 className="font-sans text-body-md text-brand-ink">설정</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="inline-flex items-center justify-center w-8 h-8 rounded-sm text-brand-muted hover:bg-brand-ink-translucent-04 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-md py-sm flex flex-col gap-md">
          <RadioGroup
            label="테마"
            name="theme"
            value={settings.theme}
            onChange={(v) => update("theme", v as ThemeOption)}
            options={[
              { value: "light", label: "라이트" },
              { value: "dark", label: "다크" },
              { value: "sepia", label: "세피아" },
              { value: "cool-gray", label: "쿨 그레이" },
              { value: "high-contrast", label: "고대비" },
              { value: "system", label: "시스템 따라가기" },
            ]}
          />

          <RadioGroup
            label="폰트 크기"
            name="fontSize"
            value={settings.fontSize}
            onChange={(v) => update("fontSize", v as FontSizeOption)}
            options={[
              { value: "sm", label: "작게" },
              { value: "md", label: "보통" },
              { value: "lg", label: "크게" },
            ]}
          />

          <Field label="언어">
            <select
              value={settings.language}
              disabled
              className="w-full h-9 px-sm border border-brand-hairline rounded-sm bg-brand-surface-card text-brand-muted text-body-sm focus:outline-none"
            >
              <option value="ko">한국어</option>
            </select>
            <p className="mt-xxs text-caption text-brand-muted">
              다국어 지원은 별도 이슈로 진행 예정.
            </p>
          </Field>

          <Field label="모델">
            <select
              value={settings.model}
              onChange={(e) => update("model", e.target.value as ModelOption)}
              disabled
              className="w-full h-9 px-sm border border-brand-hairline rounded-sm bg-brand-surface-card text-brand-muted text-body-sm focus:outline-none"
            >
              <option value="default">기본 모델</option>
            </select>
            <p className="mt-xxs text-caption text-brand-muted">
              백엔드 연결 후 모델 선택 옵션이 활성화됩니다.
            </p>
          </Field>

          <div className="mt-xs px-sm py-xs rounded-sm bg-brand-surface-card text-caption text-brand-muted">
            * 테마는 즉시 적용됩니다. 폰트 크기·언어·모델 은 선택값만 저장되고
            실제 적용은 후속 업데이트에서 지원됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <span className="font-sans text-body-sm text-brand-ink mb-xxs">
        {label}
      </span>
      {children}
    </div>
  );
}

function RadioGroup({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <Field label={label}>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-xs">
        {options.map((opt) => {
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              className={[
                "inline-flex items-center gap-xxs px-sm py-xxs rounded-pill border cursor-pointer transition-colors text-body-sm",
                checked
                  ? "border-brand-primary bg-brand-primary text-brand-on-primary"
                  : "border-brand-hairline text-brand-ink hover:bg-brand-ink-translucent-04",
              ].join(" ")}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </Field>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
