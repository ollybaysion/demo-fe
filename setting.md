# 개발 환경 세팅

FDC Agent Frontend의 **Linux (Ubuntu/Debian)** 및 **WSL2 on Windows** 환경 세팅 가이드. 아무것도 설치되지 않은 fresh shell을 가정하며, 모든 단계는 멱등(idempotent)하므로 다시 실행해도 안전합니다.

이미 일부 도구가 설치되어 있다면 해당 섹션은 건너뛰고 [§11 검증 체크리스트](#11-검증-체크리스트)에서 버전만 확인하면 됩니다.

---

## 목차

1. [대상 환경](#1-대상-환경)
2. [OS 사전 준비](#2-os-사전-준비)
3. [Git](#3-git)
4. [GitHub SSH 키](#4-github-ssh-키)
5. [Node.js (nvm — 권장)](#5-nodejs-nvm--권장)
6. [Node.js (nvm 없이 — 대안)](#6-nodejs-nvm-없이--대안)
7. [pnpm (corepack)](#7-pnpm-corepack)
8. [GitHub CLI (gh)](#8-github-cli-gh)
9. [Docker](#9-docker)
10. [VSCode + 권장 확장](#10-vscode--권장-확장)
11. [검증 체크리스트](#11-검증-체크리스트)
12. [저장소 클론 및 첫 실행](#12-저장소-클론-및-첫-실행)
13. [트러블슈팅](#13-트러블슈팅)

---

## 1. 대상 환경

- **OS**: Ubuntu 20.04 이상 / Debian 11 이상 / WSL2(Ubuntu) on Windows 10·11
- **Shell**: bash 또는 zsh
- **권한**: 시스템 패키지 설치를 위한 `sudo` 권한

WSL2를 쓰는 경우 Microsoft Store에서 Ubuntu를 설치한 뒤, 모든 명령어는 **WSL 터미널 안에서** 실행하세요. PowerShell이 아닙니다.

---

## 2. OS 사전 준비

패키지 인덱스를 갱신하고 빌드 도구·인증서를 설치합니다 (curl, nvm 설치 스크립트, 그리고 일부 native npm 패키지가 의존).

```sh
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl ca-certificates gnupg lsb-release
```

확인:

```sh
curl --version | head -1
gcc --version | head -1
```

---

## 3. Git

Git을 설치하고 커밋 author 메타데이터에 쓰일 ID를 설정합니다.

```sh
sudo apt install -y git
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
git config --global pull.rebase false   # 또는 true — 팀 선호에 따라
```

확인:

```sh
git --version          # 2.25 이상
git config --get user.email
```

---

## 4. GitHub SSH 키

이 저장소는 SSH 원격(`git@github.com:...`)을 사용하므로 GitHub 계정에 SSH 키가 등록돼 있어야 합니다.

```sh
# ed25519 키 생성 (이미 ~/.ssh/id_ed25519가 있으면 건너뜀)
ssh-keygen -t ed25519 -C "you@example.com"
# 기본 경로를 그대로 쓰려면 Enter. 비밀번호(passphrase)는 선택.

# ssh-agent 시작 + 키 등록 (passphrase를 매번 입력하지 않도록)
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 공개 키 출력 — 출력 전체를 복사
cat ~/.ssh/id_ed25519.pub
```

GitHub에서:
1. <https://github.com/settings/keys> 접속
2. **New SSH key** 클릭
3. 위에서 복사한 공개 키 붙여넣기, 제목(예: "WSL2 work laptop") 입력 후 저장.

연결 테스트:

```sh
ssh -T git@github.com
# 예상: "Hi <username>! You've successfully authenticated, ..."
```

---

## 5. Node.js (nvm — 권장)

이 프로젝트는 [`.nvmrc`](.nvmrc)에 Node.js 버전(`22.22.2`)을 pin합니다. 머신 간 동일 버전을 보장하는 가장 간단한 방법은 **nvm**(Node Version Manager)입니다.

```sh
# nvm 설치 — 최신 태그는 https://github.com/nvm-sh/nvm#installing-and-updating 에서 확인
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# shell rc 다시 로드 (nvm 명령어를 인식시키기 위함)
source ~/.bashrc          # 또는: source ~/.zshrc

# nvm 인식 확인
command -v nvm            # → "nvm" (binary가 아니라 shell function)
nvm --version
```

그다음 **클론한 저장소 안에서** pin된 Node를 설치·활성화:

```sh
cd /path/to/demo-fe
nvm install               # .nvmrc 읽음 → 22.22.2 설치
nvm use                   # 현재 shell에서 22.22.2 활성화
node -v                   # → v22.22.2
```

`cd` 시 `nvm use`가 자동 실행되도록 하려면 nvm README의 "Calling `nvm use` automatically in a directory with a .nvmrc file" 섹션을 참고해 shell rc에 auto-use 스니펫을 추가하세요. (선택)

---

## 6. Node.js (nvm 없이 — 대안)

nvm을 안 쓰고 싶다면 다음 중 하나로도 가능합니다:

- **nodejs.org에서 직접 설치** — `v22.22.2` (또는 최신 `22.x` 패치) Linux 바이너리를 <https://nodejs.org/en/download/> 에서 받아 안내대로 설치.
- **fnm** (Fast Node Manager) — `curl -fsSL https://fnm.vercel.app/install | bash` 후 `fnm use --install-if-missing 22.22.2`.
- **asdf** — `asdf plugin add nodejs && asdf install nodejs 22.22.2 && asdf global nodejs 22.22.2`.

어떤 방식을 쓰든 **버전은 `.nvmrc`(`22.22.2`)와 일치**해야 합니다. `node -v`로 확인.

---

## 7. pnpm (corepack)

Node 22에는 **corepack**이 함께 들어 있어 프로젝트별 패키지 매니저 버전을 관리합니다. 한 번만 활성화하면 됩니다:

```sh
corepack enable
corepack prepare pnpm@latest --activate
```

확인:

```sh
pnpm -v                   # 9.x 이상
which pnpm                # nvm으로 설치한 Node 경로 하위
```

> 추후 `package.json`이 스캐폴딩되면서 `packageManager` 필드가 들어가면, corepack이 그 값에 따라 pnpm 정확한 버전으로 자동 pin합니다 — 머신 간 추가 작업 불필요.

---

## 8. GitHub CLI (gh)

프로젝트 워크플로우상 PR을 터미널에서 만들기 위해 사용합니다.

```sh
# GitHub CLI apt 저장소 추가
type -p curl >/dev/null || sudo apt install -y curl
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null

sudo apt update
sudo apt install -y gh
```

인증:

```sh
gh auth login
# 선택: GitHub.com → SSH → 기존 키 업로드 또는 새로 생성
```

확인:

```sh
gh --version
gh auth status
```

---

## 9. Docker

운영 배포는 Docker 이미지로 나갑니다. 이미지를 로컬에서 빌드·검증하기 위해 Docker가 필요합니다.

### WSL2 (Windows 호스트) — 권장

Windows에 **Docker Desktop**을 설치(<https://docs.docker.com/desktop/install/windows-install/>)하고 WSL2 통합을 활성화:

1. Docker Desktop → **Settings** → **Resources** → **WSL Integration** 진입
2. 사용 중인 Ubuntu 배포판 토글 ON
3. WSL 터미널 재시작
4. WSL에서 확인: `docker --version`

### 순수 Linux (Windows 호스트 없음)

apt로 Docker Engine 설치:

```sh
# Docker 저장소 등록
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# sudo 없이 docker 사용 (적용을 위해 로그아웃 후 재로그인 필요)
sudo usermod -aG docker $USER
```

확인:

```sh
docker --version
docker run --rm hello-world      # 그룹 변경 적용을 위해 재로그인이 먼저 필요할 수 있음
```

---

## 10. VSCode + 권장 확장

**VSCode**(<https://code.visualstudio.com/>)를 설치합니다. WSL2 사용 시 **Remote - WSL** 확장도 같이 설치하고, WSL 터미널에서 `code .` 실행 — VSCode가 WSL 파일시스템에 연결된 상태로 열립니다.

이 프로젝트 권장 확장:

| 확장 | 용도 |
|---|---|
| ESLint (`dbaeumer.vscode-eslint`) | TypeScript/React 린트 |
| Prettier (`esbenp.prettier-vscode`) | 저장 시 포맷 |
| Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`) | 클래스 자동완성 + 린트 |
| EditorConfig (`editorconfig.editorconfig`) | `.editorconfig` 존중 |
| Error Lens (`usernamehw.errorlens`) | 인라인 에러 표시 |
| GitLens (`eamodio.gitlens`) | git blame / 히스토리 (선택) |

확장 사이드바(`Ctrl+Shift+X`)에서 설치하거나:

```sh
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension editorconfig.editorconfig
```

---

## 11. 검증 체크리스트

아래 블록을 그대로 실행하면 각 줄이 버전을 출력해야 합니다:

```sh
node -v          # → v22.22.2
pnpm -v          # → 9.x 이상
git --version    # → 2.25 이상
gh --version     # → 2.x
gh auth status   # → Logged in to github.com
docker --version # → 20.x 이상 (작성 시점 28.x)
ssh -T git@github.com 2>&1 | head -1    # → "Hi <username>! ..."
```

실패하는 항목이 있으면 [§13 트러블슈팅](#13-트러블슈팅) 참고.

---

## 12. 저장소 클론 및 첫 실행

```sh
git clone git@github.com:ollybaysion/demo-fe.git
cd demo-fe

# .nvmrc에 pin된 Node 버전 활성화
nvm use                    # → 22.22.2

# pnpm 활성화 (멱등 — 다시 실행해도 안전)
corepack enable

# Next.js 스캐폴딩이 머지된 후:
pnpm install
pnpm dev                   # → http://localhost:3000
```

Next.js 스캐폴딩 전까지는 저장소에 디자인 문서(`DESIGN.md`, `api.md`)와 설정 파일만 있어 `pnpm install` / `pnpm dev`는 동작하지 않습니다. 스캐폴딩 단계가 머지된 후부터 사용 가능합니다.

---

## 13. 트러블슈팅

### nvm 설치 후 `nvm: command not found`
nvm 설치 스크립트가 shell rc에 스니펫을 추가하지만, 현재 shell이 그것을 다시 로드하지 않은 상태입니다.

```sh
source ~/.bashrc           # 또는: source ~/.zshrc, ~/.profile
```

스니펫이 자동 추가되지 않았다면 수동으로 추가:

```sh
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```

### `corepack: command not found`
Node 16.10 미만이거나 corepack 미포함으로 설치된 Node를 쓰고 있습니다. nvm으로 재설치:

```sh
nvm install 22.22.2
nvm use 22.22.2
```

### `corepack enable` 시 `pnpm: permission denied`
글로벌 node_modules가 root 소유입니다 (apt + sudo로 Node를 설치하면 흔히 발생). 두 가지 해결:

- **권장**: nvm 관리 Node로 전환 — 사용자 홈 경로라 sudo 불필요. apt Node 먼저 제거:
  ```sh
  sudo apt remove -y nodejs
  # 그다음 §5의 nvm 절차로 재설치
  ```
- **임시 우회**: `sudo corepack enable && sudo corepack prepare pnpm@latest --activate`.

### 클론 시 `Permission denied (publickey)`
SSH 키가 agent에 로드되지 않았거나 GitHub에 등록되지 않았습니다.

```sh
# 키 파일 존재 확인
ls -l ~/.ssh/id_ed25519*

# agent에 로드돼 있는지 확인
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# GitHub 등록 여부 확인
ssh -T git@github.com
```

`ssh -T`가 "Permission denied"를 반환하면 [§4](#4-github-ssh-키)를 다시 진행 — 공개 키가 <https://github.com/settings/keys>에 등록돼 있어야 합니다.

### WSL2에서 `docker: command not found`
Docker Desktop의 WSL 통합이 꺼져 있습니다. Windows의 Docker Desktop → **Settings** → **Resources** → **WSL Integration** → 사용 중인 배포판 ON → WSL 터미널 재시작.

### 순수 Linux에서 `docker: permission denied`
`docker` 그룹에 아직 안 들어가 있습니다. `sudo usermod -aG docker $USER` 실행 후 **로그아웃 → 재로그인**(또는 현재 shell에서 `newgrp docker`)해야 그룹이 반영됩니다.

### `gh pr create` 인증 오류
SSH 프로토콜로 재인증:

```sh
gh auth login -p ssh -h github.com
```

### `nvm use` 후 `node -v`가 다른 버전을 출력
nvm은 shell 단위로 활성화되어 새 터미널에서는 자동 적용되지 않습니다. `nvm alias default 22.22.2`로 기본값을 설정하거나, `cd` 시 `.nvmrc`를 자동 읽는 auto-use 훅을 shell rc에 추가하세요(nvm README의 "deeper shell integration" 참고). 매 세션마다 `nvm use`를 수동으로 실행해도 됩니다.

### `pnpm dev` 실행 시 명령 없음 / `package.json` 없음
Next.js 스캐폴딩이 아직 안 들어왔습니다. 현재 저장소엔 디자인 문서뿐입니다. 스캐폴딩 PR이 머지된 후부터 `pnpm install` / `pnpm dev`가 동작합니다.
