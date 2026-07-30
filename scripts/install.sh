#!/usr/bin/env bash
set -euo pipefail

REPO="filiks265/filiks"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
if [ ! -w "$INSTALL_DIR" ]; then
  INSTALL_DIR="$HOME/.local/bin"
  echo "Falling back to $INSTALL_DIR"
fi

detect_platform() {
  local os arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"

  case "$os" in
    linux)   os="linux" ;;
    darwin)  os="darwin" ;;
    mingw*|msys*|cygwin*) os="windows" ;;
    *)       echo "Unsupported OS: $os"; exit 1 ;;
  esac

  case "$arch" in
    x86_64|amd64) arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    *)            echo "Unsupported arch: $arch"; exit 1 ;;
  esac

  echo "${os}-${arch}"
}

get_latest_tag() {
  curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" |
    grep '"tag_name":' |
    sed 's/.*"tag_name": "\(.*\)".*/\1/'
}

main() {
  local platform target tag url

  platform="$(detect_platform)"
  echo "Detected platform: $platform"

  # Map platform to release archive name
  case "$platform" in
    linux-x64)   target="linux-x64" ;;
    windows-x64) target="windows-x64" ;;
    darwin-arm64) target="darwin-arm64" ;;
    darwin-x64)  target="darwin-x64" ;;
    *)           echo "No build available for $platform"; exit 1 ;;
  esac

  tag="${1:-$(get_latest_tag)}"
  if [ -z "$tag" ]; then
    echo "Could not determine latest release"
    exit 1
  fi
  echo "Latest release: $tag"

  url="https://github.com/$REPO/releases/download/$tag/filiks-${target}.tar.gz"
  echo "Downloading: $url"

  tmpdir="$(mktemp -d)"
  curl -fsSL "$url" -o "$tmpdir/filiks.tar.gz"
  tar -xzf "$tmpdir/filiks.tar.gz" -C "$tmpdir"

  if [ "$platform" = "windows-x64" ]; then
    binary="filiks.exe"
  else
    binary="filiks"
  fi

  if [ ! -f "$tmpdir/$binary" ]; then
    echo "Binary not found in archive (expected: $binary)"
    ls -la "$tmpdir"
    exit 1
  fi

  mkdir -p "$INSTALL_DIR"
  install -m 755 "$tmpdir/$binary" "$INSTALL_DIR/$binary"
  rm -rf "$tmpdir"

  echo "Installed filiks to $INSTALL_DIR/$binary"
  if ! echo ":$PATH:" | grep -q ":$INSTALL_DIR:"; then
    echo "Add $INSTALL_DIR to your PATH:"
    echo "  export PATH=\"\$PATH:$INSTALL_DIR\"" >> "$HOME/.bashrc"
    echo "  export PATH=\"\$PATH:$INSTALL_DIR\"" >> "$HOME/.zshrc" 2>/dev/null || true
    echo "Then run: source ~/.bashrc"
  fi
}

main "$@"
