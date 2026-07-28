#!/bin/sh
set -eu

REPO="filiks265/filiks"
INSTALL_DIR="${HOME}/.filiks/bin"
FILIKS_BIN="${INSTALL_DIR}/filiks"

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
  linux)
    TARGET="linux-x64"
    ;;
  darwin)
    case "$ARCH" in
      x86_64) TARGET="darwin-x64" ;;
      arm64)  TARGET="darwin-arm64" ;;
      *)      echo "Unsupported architecture: ${ARCH}"; exit 1 ;;
    esac
    ;;
  *)
    echo "Unsupported OS: ${OS}"
    echo "For Windows, use:"
    echo "  irm https://raw.githubusercontent.com/${REPO}/main/install.ps1 | iex"
    exit 1
    ;;
esac

echo "Downloading filiks for ${TARGET}..."
URL="https://github.com/${REPO}/releases/latest/download/filiks-${TARGET}.tar.gz"
mkdir -p "$INSTALL_DIR"
curl -fsSL "$URL" | tar -xz -C "$INSTALL_DIR"
chmod +x "$FILIKS_BIN"

case "${SHELL:-}" in
  */zsh) PROFILE="${HOME}/.zshrc" ;;
  */bash) PROFILE="${HOME}/.bashrc" ;;
  *)     PROFILE="${HOME}/.profile" ;;
esac

if ! echo "$PATH" | grep -qF "${INSTALL_DIR}"; then
  {
    echo ""
    echo "# filiks"
    echo "export PATH=\"\$PATH:${INSTALL_DIR}\""
  } >> "$PROFILE"
  echo "Added ${INSTALL_DIR} to PATH in ${PROFILE}"
  echo "Restart your terminal or run: source ${PROFILE}"
fi

echo "filiks installed to ${FILIKS_BIN}"
echo "Run: filiks"
