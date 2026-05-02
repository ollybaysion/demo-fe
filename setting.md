# Development Environment Setup

End-to-end setup guide for FDC Agent Frontend on **Linux (Ubuntu/Debian)** and **WSL2 on Windows**. Assumes a fresh shell with nothing pre-installed; every step is idempotent so you can re-run safely.

If you already have some tools, skip the relevant sections — just confirm versions in [§11 Verification](#11-verification-checklist).

---

## Table of Contents

1. [Target environment](#1-target-environment)
2. [OS-level prerequisites](#2-os-level-prerequisites)
3. [Git](#3-git)
4. [GitHub SSH key](#4-github-ssh-key)
5. [Node.js via nvm (recommended)](#5-nodejs-via-nvm-recommended)
6. [Node.js without nvm (alternatives)](#6-nodejs-without-nvm-alternatives)
7. [pnpm via corepack](#7-pnpm-via-corepack)
8. [GitHub CLI (gh)](#8-github-cli-gh)
9. [Docker](#9-docker)
10. [VSCode + recommended extensions](#10-vscode--recommended-extensions)
11. [Verification checklist](#11-verification-checklist)
12. [Clone & first run](#12-clone--first-run)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Target environment

- **OS:** Ubuntu 20.04+ / Debian 11+ / WSL2 (Ubuntu) on Windows 10/11
- **Shell:** bash or zsh
- **Privileges:** `sudo` access for system-level package installs

For WSL2 specifically, install Ubuntu from the Microsoft Store and run all commands inside the WSL terminal — **not** PowerShell.

---

## 2. OS-level prerequisites

Refresh the package index and install build tools and CA certificates (needed by curl, nvm install scripts, and many native npm packages).

```sh
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl ca-certificates gnupg lsb-release
```

Verify:

```sh
curl --version | head -1
gcc --version | head -1
```

---

## 3. Git

Install Git and set your identity (used in commit author metadata).

```sh
sudo apt install -y git
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
git config --global pull.rebase false   # or true; team preference
```

Verify:

```sh
git --version          # 2.25 or higher
git config --get user.email
```

---

## 4. GitHub SSH key

The repo uses an SSH remote (`git@github.com:...`), so you need an SSH key registered with GitHub.

```sh
# Generate a new ed25519 key (skip if you already have ~/.ssh/id_ed25519)
ssh-keygen -t ed25519 -C "you@example.com"
# Press Enter to accept the default path; set a passphrase if you want one.

# Start ssh-agent and add the key (so you don't retype the passphrase every time)
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Print the public key — copy the entire output
cat ~/.ssh/id_ed25519.pub
```

Then on GitHub:
1. Open <https://github.com/settings/keys>
2. Click **New SSH key**
3. Paste the public key, give it a title (e.g., "WSL2 work laptop"), and save.

Test the connection:

```sh
ssh -T git@github.com
# Expected: "Hi <username>! You've successfully authenticated, ..."
```

---

## 5. Node.js via nvm (recommended)

This project pins Node.js to the version in [`.nvmrc`](.nvmrc) (currently `22.22.2`). The simplest way to honor that pin across machines is **nvm** (Node Version Manager).

```sh
# Install nvm (always check https://github.com/nvm-sh/nvm#installing-and-updating for the latest tag)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Reload your shell rc so the `nvm` command is available
source ~/.bashrc          # or: source ~/.zshrc

# Verify nvm is available
command -v nvm            # → "nvm" (it's a shell function, not a binary)
nvm --version
```

Then, **inside the cloned repository**, install and activate the pinned Node:

```sh
cd /path/to/demo-fe
nvm install               # reads .nvmrc → installs 22.22.2
nvm use                   # activates 22.22.2 in this shell
node -v                   # → v22.22.2
```

To make `nvm use` happen automatically on `cd`, add an `auto-use` snippet to your shell rc (optional — see nvm README §Calling `nvm use` automatically in a directory with a .nvmrc file).

---

## 6. Node.js without nvm (alternatives)

If you prefer not to install nvm, any of these work:

- **Direct install from nodejs.org** — Download `v22.22.2` (or the latest `22.x` patch) Linux binaries from <https://nodejs.org/en/download/> and follow the install instructions.
- **fnm** (Fast Node Manager) — `curl -fsSL https://fnm.vercel.app/install | bash`, then `fnm use --install-if-missing 22.22.2`.
- **asdf** — `asdf plugin add nodejs && asdf install nodejs 22.22.2 && asdf global nodejs 22.22.2`.

Whichever method you choose, the version must match `.nvmrc` (`22.22.2`). Verify with `node -v`.

---

## 7. pnpm via corepack

Node 22 ships with **corepack**, which manages package manager versions per project. Enable it once:

```sh
corepack enable
corepack prepare pnpm@latest --activate
```

Verify:

```sh
pnpm -v                   # 9.x or higher
which pnpm                # path under your nvm Node install
```

> Once `package.json` is scaffolded with a `packageManager` field, `corepack` will pin pnpm to the exact version recorded there — no further action needed across machines.

---

## 8. GitHub CLI (gh)

Used to create and review PRs from the terminal per the project workflow.

```sh
# Add the GitHub CLI apt repo
type -p curl >/dev/null || sudo apt install -y curl
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null

sudo apt update
sudo apt install -y gh
```

Authenticate:

```sh
gh auth login
# Choose: GitHub.com → SSH → upload your existing key or generate a new one
```

Verify:

```sh
gh --version
gh auth status
```

---

## 9. Docker

Production deploys ship as Docker images. You'll want Docker locally to build and test those images.

### WSL2 (Windows host) — recommended

Install **Docker Desktop** on Windows (<https://docs.docker.com/desktop/install/windows-install/>), then enable WSL2 integration:

1. Open Docker Desktop → **Settings** → **Resources** → **WSL Integration**.
2. Toggle on the Ubuntu distro you use.
3. Restart the WSL terminal.
4. Verify in WSL: `docker --version`.

### Pure Linux (no Windows host)

Install Docker Engine via apt:

```sh
# Set up the repository
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Run docker without sudo (requires log out + back in to take effect)
sudo usermod -aG docker $USER
```

Verify:

```sh
docker --version
docker run --rm hello-world      # may need to re-login first
```

---

## 10. VSCode + recommended extensions

Install **VSCode** (<https://code.visualstudio.com/>). For WSL2, also install the **Remote - WSL** extension, then run `code .` from inside your WSL terminal — VSCode opens connected to the WSL filesystem.

Recommended extensions for this project:

| Extension | Purpose |
|---|---|
| ESLint (`dbaeumer.vscode-eslint`) | Lint TypeScript/React files |
| Prettier (`esbenp.prettier-vscode`) | Format on save |
| Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`) | Class autocomplete + lint |
| EditorConfig (`editorconfig.editorconfig`) | Honor `.editorconfig` if present |
| Error Lens (`usernamehw.errorlens`) | Inline error display |
| GitLens (`eamodio.gitlens`) | Git blame / history (optional) |

Install via the Extensions sidebar (`Ctrl+Shift+X`) or:

```sh
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension editorconfig.editorconfig
```

---

## 11. Verification checklist

Run this block — every line should print a version:

```sh
node -v          # → v22.22.2
pnpm -v          # → 9.x or higher
git --version    # → 2.25+
gh --version     # → 2.x
gh auth status   # → Logged in to github.com
docker --version # → 20.x or higher (28.x at time of writing)
ssh -T git@github.com 2>&1 | head -1    # → "Hi <username>! ..."
```

If anything fails, see [§13 Troubleshooting](#13-troubleshooting).

---

## 12. Clone & first run

```sh
git clone git@github.com:ollybaysion/demo-fe.git
cd demo-fe

# Activate the Node version pinned in .nvmrc
nvm use                    # → 22.22.2

# Ensure pnpm is enabled (idempotent — safe to re-run)
corepack enable

# After the Next.js scaffolding step lands:
pnpm install
pnpm dev                   # → http://localhost:3000
```

Until Next.js is scaffolded, the repository contains design documents (`DESIGN.md`, `api.md`) and configuration files only — `pnpm install` / `pnpm dev` will be available after that step.

---

## 13. Troubleshooting

### `nvm: command not found` after install
The nvm install script appends a snippet to your shell rc, but the current shell hasn't reloaded it.

```sh
source ~/.bashrc           # or: source ~/.zshrc, ~/.profile
```

If the snippet wasn't appended, add it manually:

```sh
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```

### `corepack: command not found`
You're using a Node version older than 16.10 (or it was installed without corepack). Re-install Node via nvm:

```sh
nvm install 22.22.2
nvm use 22.22.2
```

### `pnpm: permission denied` when running `corepack enable`
Your global node_modules has root ownership (typical when Node was installed via apt with `sudo`). Two fixes:

- **Preferred:** Switch to nvm-managed Node — paths are user-owned, no sudo needed. Uninstall apt Node first:
  ```sh
  sudo apt remove -y nodejs
  # then install via nvm (§5)
  ```
- **Workaround:** `sudo corepack enable && sudo corepack prepare pnpm@latest --activate`.

### `Permission denied (publickey)` when cloning
Your SSH key isn't loaded or isn't registered on GitHub.

```sh
# Confirm the key file exists
ls -l ~/.ssh/id_ed25519*

# Make sure it's loaded into the agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Confirm it's registered on GitHub
ssh -T git@github.com
```

If `ssh -T` says "Permission denied", repeat [§4](#4-github-ssh-key) — the public key must be on the account at <https://github.com/settings/keys>.

### `docker: command not found` in WSL2
Docker Desktop's WSL integration isn't enabled. Open Docker Desktop on Windows → **Settings** → **Resources** → **WSL Integration** → enable for your distro → restart the WSL terminal.

### `docker: permission denied` (no Windows / pure Linux)
You're not in the `docker` group yet. After `sudo usermod -aG docker $USER`, you must **log out and back in** (or run `newgrp docker` in the current shell) for the group membership to take effect.

### `gh pr create` fails with auth error
Re-run auth, choosing SSH protocol:

```sh
gh auth login -p ssh -h github.com
```

### `node -v` prints a wrong version after `nvm use`
nvm activates per-shell — it's not persistent across new terminals unless `nvm alias default 22.22.2` is set, or you have an `auto-use` snippet that reads `.nvmrc` on `cd`. Run `nvm use` manually each session, or add the auto-use hook from the [nvm README](https://github.com/nvm-sh/nvm#deeper-shell-integration).

### `pnpm dev` says command not found / no `package.json`
Next.js hasn't been scaffolded yet. The repository currently contains design docs only. Once `feature/chat-interface` (or similar) lands the scaffolding, `pnpm install` and `pnpm dev` will work.
