#!/usr/bin/env sh
# =============================================================================
#  viztini's blog — terminal reader installer
#  curl -fsSL https://viztini.github.io/install.sh | sh
# =============================================================================
#
#  Supports:
#    Linux  — Debian/Ubuntu, Arch/Manjaro, Fedora/RHEL/CentOS, openSUSE,
#             Alpine, Void, Gentoo (portage), NixOS (nix-env)
#    macOS  — via Homebrew (auto-installed if missing)
#    Windows— via Git Bash / MSYS2 / Cygwin (winget or Scoop for Python)
#    BSD    — FreeBSD (pkg), OpenBSD (pkg_add)
#    Android— Termux (pkg)
#
#  What it does:
#    1. Detects OS + package manager
#    2. Installs Python 3 + pip if missing
#    3. Creates an isolated virtualenv under ~/.viztini-blog/venv
#    4. Installs Python dependencies into the venv
#    5. Downloads the blog reader script
#    6. Runs it
# =============================================================================

set -e

# ── colours (disabled on dumb terminals) ─────────────────────────────────────
if [ -t 1 ] && [ "${TERM:-}" != "dumb" ]; then
    C_RESET='\033[0m'
    C_BOLD='\033[1m'
    C_GREEN='\033[0;32m'
    C_CYAN='\033[0;36m'
    C_YELLOW='\033[0;33m'
    C_RED='\033[0;31m'
    C_MAGENTA='\033[0;35m'
else
    C_RESET='' C_BOLD='' C_GREEN='' C_CYAN='' C_YELLOW='' C_RED='' C_MAGENTA=''
fi

SCRIPT_URL="https://viztini.github.io/blog.py"
INSTALL_DIR="${HOME}/.viztini-blog"
VENV_DIR="${INSTALL_DIR}/venv"
SCRIPT_PATH="${INSTALL_DIR}/blog.py"
REQUIREMENTS="requests readchar beautifulsoup4 rich"

# ── helpers ───────────────────────────────────────────────────────────────────
log()  { printf "${C_GREEN}${C_BOLD}[+]${C_RESET} %s\n" "$*"; }
info() { printf "${C_CYAN}[~]${C_RESET} %s\n" "$*"; }
warn() { printf "${C_YELLOW}[!]${C_RESET} %s\n" "$*"; }
die()  { printf "${C_RED}${C_BOLD}[x] ERROR:${C_RESET} %s\n" "$*" >&2; exit 1; }
sep()  { printf "${C_MAGENTA}%s${C_RESET}\n" "────────────────────────────────────────────"; }

has() { command -v "$1" >/dev/null 2>&1; }

# ── OS detection ──────────────────────────────────────────────────────────────
detect_os() {
    OS=""
    DISTRO=""
    PKG_MGR=""

    case "$(uname -s)" in
        Linux)
            OS="linux"
            if [ -f /etc/os-release ]; then
                . /etc/os-release
                DISTRO="${ID:-unknown}"
                DISTRO_LIKE="${ID_LIKE:-}"
            elif [ -f /etc/arch-release ];   then DISTRO="arch"
            elif [ -f /etc/debian_version ]; then DISTRO="debian"
            elif [ -f /etc/fedora-release ];  then DISTRO="fedora"
            elif [ -f /etc/alpine-release ];  then DISTRO="alpine"
            fi

            # resolve package manager from distro or ID_LIKE
            _resolve_pkg_mgr() {
                case "$1" in
                    debian|ubuntu|linuxmint|pop|kali|elementary|zorin|raspbian)
                        PKG_MGR="apt" ;;
                    arch|manjaro|endeavouros|garuda|artix|cachyos)
                        PKG_MGR="pacman" ;;
                    fedora)
                        PKG_MGR="dnf" ;;
                    rhel|centos|almalinux|rocky|ol)
                        has dnf && PKG_MGR="dnf" || PKG_MGR="yum" ;;
                    opensuse*|suse*)
                        PKG_MGR="zypper" ;;
                    alpine)
                        PKG_MGR="apk" ;;
                    void)
                        PKG_MGR="xbps" ;;
                    gentoo)
                        PKG_MGR="portage" ;;
                    nixos|nix)
                        PKG_MGR="nix" ;;
                    android)  # Termux sets $PREFIX
                        PKG_MGR="termux" ;;
                    *)  PKG_MGR="unknown" ;;
                esac
            }

            _resolve_pkg_mgr "$DISTRO"
            # fallback: try ID_LIKE chain
            if [ "$PKG_MGR" = "unknown" ] && [ -n "$DISTRO_LIKE" ]; then
                for _like in $DISTRO_LIKE; do
                    _resolve_pkg_mgr "$_like"
                    [ "$PKG_MGR" != "unknown" ] && break
                done
            fi
            # Termux environment check
            [ -n "${PREFIX+x}" ] && echo "$PREFIX" | grep -q "com.termux" && PKG_MGR="termux"
            ;;
        Darwin)
            OS="macos"
            PKG_MGR="brew"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            OS="windows"
            if has winget;   then PKG_MGR="winget"
            elif has scoop;  then PKG_MGR="scoop"
            elif has choco;  then PKG_MGR="choco"
            else PKG_MGR="unknown"
            fi
            ;;
        FreeBSD)
            OS="freebsd"; PKG_MGR="pkg" ;;
        OpenBSD)
            OS="openbsd"; PKG_MGR="pkg_add" ;;
        *)
            OS="unknown"; PKG_MGR="unknown" ;;
    esac

    info "OS      : ${OS} / ${DISTRO:-n/a}"
    info "Pkg mgr : ${PKG_MGR}"
}

# ── privilege helper ──────────────────────────────────────────────────────────
# Returns "sudo" if needed and available, empty string if already root/Termux
_sudo() {
    [ "$OS" = "android" ] || [ "$PKG_MGR" = "termux" ] && return
    [ "$(id -u)" -eq 0 ] && return
    has sudo && printf "sudo" && return
    has doas && printf "doas" && return
    die "Need root privileges. Install sudo/doas or run as root."
}

# ── install Python 3 ──────────────────────────────────────────────────────────
install_python() {
    if has python3 && has pip3; then
        info "Python 3 already installed: $(python3 --version)"
        return
    fi

    log "Installing Python 3..."
    SUDO=$(_sudo)

    case "$PKG_MGR" in
        apt)
            $SUDO apt-get update -qq
            $SUDO apt-get install -y python3 python3-pip python3-venv curl
            ;;
        pacman)
            $SUDO pacman -Sy --noconfirm python python-pip
            ;;
        dnf)
            $SUDO dnf install -y python3 python3-pip
            ;;
        yum)
            $SUDO yum install -y python3 python3-pip
            ;;
        zypper)
            $SUDO zypper install -y python3 python3-pip
            ;;
        apk)
            $SUDO apk add --no-cache python3 py3-pip
            ;;
        xbps)
            $SUDO xbps-install -Sy python3 python3-pip
            ;;
        portage)
            $SUDO emerge --ask=n dev-lang/python dev-python/pip
            ;;
        nix)
            nix-env -iA nixpkgs.python3 nixpkgs.python3Packages.pip
            ;;
        termux)
            pkg update -y
            pkg install -y python
            ;;
        brew)
            # macOS: install Homebrew if missing
            if ! has brew; then
                warn "Homebrew not found. Installing..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                # add brew to PATH for Apple Silicon
                [ -f /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"
            fi
            brew install python3
            ;;
        winget)
            winget install -e --id Python.Python.3 --accept-source-agreements --accept-package-agreements
            warn "Restart your shell after Python installs on Windows if PATH is not updated."
            ;;
        scoop)
            scoop install python
            ;;
        choco)
            choco install python3 -y
            ;;
        *)
            die "Cannot auto-install Python on this system (pkg manager: ${PKG_MGR}).\nPlease install Python 3 manually from https://python.org and re-run."
            ;;
    esac
}

# ── ensure pip is bootstrapped ────────────────────────────────────────────────
ensure_pip() {
    PYTHON=$(find_python)
    if ! "$PYTHON" -m pip --version >/dev/null 2>&1; then
        warn "pip not found — bootstrapping via ensurepip..."
        "$PYTHON" -m ensurepip --upgrade 2>/dev/null || {
            # last resort: get-pip.py
            warn "ensurepip failed — trying get-pip.py..."
            GETPIP=$(mktemp /tmp/get-pip.XXXXXX.py)
            curl -fsSL https://bootstrap.pypa.io/get-pip.py -o "$GETPIP"
            "$PYTHON" "$GETPIP"
            rm -f "$GETPIP"
        }
    fi
}

# ── resolve python binary ─────────────────────────────────────────────────────
find_python() {
    for _bin in python3 python3.13 python3.12 python3.11 python3.10 python3.9 python; do
        if has "$_bin"; then
            _ver=$("$_bin" -c "import sys; print(sys.version_info[:2])" 2>/dev/null || true)
            # require >= 3.8
            case "$_ver" in
                "(3, 8)"*|"(3, 9)"*|"(3, 1"*) printf "%s" "$_bin"; return ;;
            esac
        fi
    done
    die "Python 3.8+ not found even after install. PATH may need updating."
}

# ── virtualenv setup ──────────────────────────────────────────────────────────
setup_venv() {
    PYTHON=$(find_python)
    log "Setting up virtual environment at ${VENV_DIR}..."

    mkdir -p "$INSTALL_DIR"

    # check venv module availability
    if ! "$PYTHON" -m venv --help >/dev/null 2>&1; then
        warn "venv module missing — attempting to install..."
        SUDO=$(_sudo)
        case "$PKG_MGR" in
            apt)    $SUDO apt-get install -y python3-venv ;;
            pacman) $SUDO pacman -S --noconfirm python ;;  # venv bundled
            dnf)    $SUDO dnf install -y python3 ;;
            apk)    $SUDO apk add --no-cache python3 ;;
            *)      warn "Cannot install venv automatically. Falling back to system pip." ; VENV_DIR="" ; return ;;
        esac
    fi

    "$PYTHON" -m venv "$VENV_DIR"

    # activate for remainder of script
    # shellcheck disable=SC1091
    . "${VENV_DIR}/bin/activate"

    log "Virtualenv activated."
}

# ── install Python deps ───────────────────────────────────────────────────────
install_deps() {
    log "Installing Python dependencies..."

    if [ -n "$VENV_DIR" ] && [ -f "${VENV_DIR}/bin/pip" ]; then
        PIP="${VENV_DIR}/bin/pip"
    elif has pip3; then
        PIP="pip3"
    elif has pip; then
        PIP="pip"
    else
        PYTHON=$(find_python)
        PIP="$PYTHON -m pip"
    fi

    # upgrade pip silently first
    $PIP install --upgrade pip --quiet

    # install requirements
    # shellcheck disable=SC2086
    $PIP install --quiet $REQUIREMENTS

    log "Dependencies installed."
}

# ── download blog script ──────────────────────────────────────────────────────
download_script() {
    log "Downloading blog reader..."
    mkdir -p "$INSTALL_DIR"

    if has curl; then
        curl -fsSL "$SCRIPT_URL" -o "$SCRIPT_PATH"
    elif has wget; then
        wget -qO "$SCRIPT_PATH" "$SCRIPT_URL"
    else
        die "Neither curl nor wget found. Cannot download the script."
    fi

    log "Script saved to ${SCRIPT_PATH}"
}

# ── run ───────────────────────────────────────────────────────────────────────
run_blog() {
    sep
    log "Launching viztini's blog reader..."
    sep
    printf "\n"

    if [ -n "$VENV_DIR" ] && [ -f "${VENV_DIR}/bin/python" ]; then
        PYTHON_RUN="${VENV_DIR}/bin/python"
    else
        PYTHON_RUN=$(find_python)
    fi

    "$PYTHON_RUN" "$SCRIPT_PATH"
}

# ── re-run shortcut (written to ~/.local/bin) ─────────────────────────────────
install_launcher() {
    LAUNCHER_DIR="${HOME}/.local/bin"
    LAUNCHER="${LAUNCHER_DIR}/viztini"
    mkdir -p "$LAUNCHER_DIR"

    cat > "$LAUNCHER" <<EOF
#!/usr/bin/env sh
# viztini blog launcher — generated by install.sh
. "${VENV_DIR}/bin/activate" 2>/dev/null || true
exec "${VENV_DIR}/bin/python" "${SCRIPT_PATH}" "\$@"
EOF
    chmod +x "$LAUNCHER"

    # check if ~/.local/bin is in PATH
    case ":${PATH}:" in
        *":${LAUNCHER_DIR}:"*) ;;
        *) warn "Add ${LAUNCHER_DIR} to your PATH to use the 'viztini' command." ;;
    esac

    info "Installed launcher: ${LAUNCHER}"
    info "Next time just run: viztini"
}

# ── Windows-specific note ─────────────────────────────────────────────────────
windows_note() {
    if [ "$OS" = "windows" ]; then
        warn "You are on Windows (Git Bash / MSYS2 / Cygwin)."
        warn "If Python was just installed, you may need to restart your shell."
        warn "WSL2 (Windows Subsystem for Linux) is recommended for the best experience."
        warn "  => https://learn.microsoft.com/en-us/windows/wsl/install"
        printf "\n"
    fi
}

# ── main ──────────────────────────────────────────────────────────────────────
main() {
    sep
    detect_os
    windows_note
    sep

    install_python
    ensure_pip
    setup_venv
    install_deps
    download_script
    install_launcher

    run_blog
}

main "$@"
