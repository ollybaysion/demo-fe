# 폰트 (self-hosted)

이 폴더의 `.woff2` 는 **레포에 커밋된 self-host 폰트**다. `layout.tsx` 가
`next/font/local` 로 이 파일들만 참조한다.

## 왜 커밋하나

`next/font/google` 은 **빌드 타임에** `fonts.googleapis.com` 에서 폰트를
받아온다. 사내(폐쇄망) 빌드 환경은 외부로 못 나가 폰트가 깨졌다. 여기
파일을 커밋해 쓰면 **외부·네트워크·npm 폰트 의존성이 0** 이 되어 어떤
환경에서도 동일하게 빌드된다.

## 파일 · 출처 · 라이선스

전부 SIL Open Font License 1.1 (OFL) — 임베드/재배포 허용.

| 파일 | 폰트 · weight | 출처 |
| --- | --- | --- |
| `inter-400.woff2` / `inter-500.woff2` | Inter 400/500 (latin) | `@fontsource/inter` |
| `cormorant-garamond-500.woff2` | Cormorant Garamond 500 (latin) | `@fontsource/cormorant-garamond` |
| `jetbrains-mono-400.woff2` | JetBrains Mono 400 (latin) | `@fontsource/jetbrains-mono` |
| `noto-serif-kr-400.woff2` / `noto-serif-kr-500.woff2` | Noto Serif KR 400/500 (latin subset) | `@fontsource/noto-serif-kr` |
| `pretendard-variable.woff2` | Pretendard Variable (45~920) | `pretendard` npm |
| `d2coding-subset.woff2` | D2Coding subset 400 | `d2coding` npm |

## 폰트 교체/추가 시

1. `.woff2` 를 이 폴더에 추가(커밋).
2. `layout.tsx` 에서 `next/font/local` 로 참조.

`next/font/google` 은 쓰지 않는다(사내 빌드 파손 원인).
