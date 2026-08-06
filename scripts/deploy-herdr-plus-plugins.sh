#!/bin/bash
# hermes-j11l.6.4: Deploy Herdr Plus plugins from Aegis to Talaris
# Run this script ON TALARI to sync missing plugins from Aegis.
# Requires: SSH access from Talaris to Aegis, or a shared filesystem.
#
# Usage:
#   chmod +x scripts/deploy-herdr-plus-plugins.sh
#   ./scripts/deploy-herdr-plus-plugins.sh
#
# Prerequisites:
#   - SSH key from Talaris to Aegis configured (ssh aegis)
#   - OPENBRAIN_KEY environment variable set (for ob1 plugin)
#   - Or run with --local to copy from a shared mount point
set -euo pipefail

AEGIS_HOST="${AEGIS_HOST:-aegis.tailc2f398.ts.net}"
AEGIS_USER="${AEGIS_USER:-hermes}"
AEGIS_PLUGINS_DIR="/Users/hermes/.hermes/plugins"
TALARI_PLUGINS_DIR="/Users/jack.reis/.hermes/plugins"

if [ "$1" = "--local" ]; then
    AEGIS_PLUGINS_DIR="${AEGIS_PLUGINS_DIR:-/Volumes/hermes/.hermes/plugins}"
    USE_LOCAL=true
else
    USE_LOCAL=false
fi

echo "=== Hermes-j11l.6.4: Deploy Herdr Plus plugins to Talaris ==="
echo "Target: $TALARI_PLUGINS_DIR"
echo "Source: $AEGIS_PLUGINS_DIR"
echo ""

# Plugins to deploy from Aegis to Talaris
PLUGINS_TO_DEPLOY=(
    "superpowers"
    "ob1"
    "ob1,hindsight,holographic,honcho"
    "fleet-beacon-consumer"
)

# Plugins that Talaris has but Aegis doesn't (keep these)
TALARI_ONLY_PLUGINS=(
    "herdr-aegis"
)

# Plugins that both hosts should have (verify only)
SHARED_PLUGINS=(
    "herdr-agent-state"
)

deploy_plugin() {
    local plugin_name="$1"
    local src=""
    local dst="$TALARI_PLUGINS_DIR/$plugin_name"

    if [ "$USE_LOCAL" = true ]; then
        src="$AEGIS_PLUGINS_DIR/$plugin_name"
    else
        # Check if plugin exists on Aegis
        if ! ssh "$AEGIS_USER@$AEGIS_HOST" "test -d '$AEGIS_PLUGINS_DIR/$plugin_name'" 2>/dev/null; then
            echo "SKIP: $plugin_name — not found on Aegis"
            return 0
        fi
        src="ssh://$AEGIS_USER@$AEGIS_HOST/$AEGIS_PLUGINS_DIR/$plugin_name"
    fi

    # Check if already deployed (hash comparison)
    if [ "$USE_LOCAL" = true ]; then
        if [ -d "$dst" ] && [ "$(find "$dst" -type f -exec shasum -a 256 {} \; | cut -d' ' -f1 | sort | shasum -a 256 | cut -d' ' -f1)" = \
                                "$(find "$src" -type f -exec shasum -a 256 {} \; | cut -d' ' -f1 | sort | shasum -a 256 | cut -d' ' -f1)" ]; then
            echo "OK: $plugin_name — already in sync"
            return 0
        fi
    fi

    echo "DEPLOY: $plugin_name"
    mkdir -p "$dst"
    if [ "$USE_LOCAL" = true ]; then
        cp -a "$src/." "$dst/"
    else
        rsync -av --delete "$src/" "$dst/"
    fi

    # Special handling for ob1 plugin
    if [ "$plugin_name" = "ob1" ]; then
        if [ -z "${OPENBRAIN_KEY:-}" ]; then
            echo "  WARNING: ob1 plugin requires OPENBRAIN_KEY env var. Set it in shell profile."
        fi
    fi

    # Create empty plugin.yaml if missing
    if [ ! -f "$dst/plugin.yaml" ]; then
        cat > "$dst/plugin.yaml" << EOF
name: ${plugin_name}
version: "1.0"
description: "Deployed from Aegis to Talaris (hermes-j11l.6.4)"
EOF
        echo "  Created plugin.yaml"
    fi
}

# Deploy each plugin
for plugin in "${PLUGINS_TO_DEPLOY[@]}"; do
    deploy_plugin "$plugin"
done

# Verify
echo ""
echo "=== Deployment summary ==="
echo "Plugins on Talaris:"
ls -1 "$TALARI_PLUGINS_DIR/" 2>/dev/null || echo "(none)"
echo ""
echo "Plugins on Aegis:"
ls -1 "$AEGIS_PLUGINS_DIR/" 2>/dev/null || echo "(none)"
echo ""
echo "NOTE: superpowers, ob1, and ob1,hindsight,holographic,honcho require"
echo "OPENBRAIN_KEY and memory plane tunnels to be configured on Talaris."
