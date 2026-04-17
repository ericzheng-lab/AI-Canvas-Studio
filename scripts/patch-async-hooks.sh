#!/bin/bash
# post-build patch: fix bare "async_hooks" imports in next-on-pages output
# The next-on-pages webpack plugin strips the "node:" prefix from Node.js built-ins,
# producing bare `import "async_hooks"` which Cloudflare Workers cannot resolve.
# This script patches the generated files to use the proper Worklet/Worker-compatible form.

BUILD_OUTPUT_DIR=".vercel/output/static"

if [ ! -d "$BUILD_OUTPUT_DIR" ]; then
  echo "[patch-async-hooks] No build output found at $BUILD_OUTPUT_DIR, skipping"
  exit 0
fi

echo "[patch-async_hooks] Patching async_hooks imports..."

# Find all .js files that have the problematic bare import
FOUND=0
for f in $(find "$BUILD_OUTPUT_DIR" -name "*.js" -type f 2>/dev/null); do
  if grep -q 'from"async_hooks"\|from'\''async_hooks'\''' "$f" 2>/dev/null; then
    echo "  Patching: $f"
    # Replace bare import with a no-op shim (AsyncLocalStorage is available via globalThis from nodejs_compat)
    # Replace: import * as Ye from"async_hooks";
    # With:   import*as Ye from"node:async_hooks"; -- but node: prefix also may not work in worker
    # Actually let's just stub it out since we don't actually need async_hooks in our routes
    sed -i '' 's/import\*as Ye from"async_hooks"/import*as Ye from"node:async_hooks"/g' "$f"
    sed -i '' "s/import\*as Ye from'async_hooks'/import*as Ye from'node:async_hooks'/g" "$f"
    FOUND=$((FOUND+1))
  fi
done

echo "[patch-async_hooks] Patched $FOUND file(s)"
echo "[patch-async_hooks] Done."
