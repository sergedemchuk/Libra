#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# Libra — Full Test Suite Runner
# Iterates through every Lambda directory and the frontend, runs npm install
# and npm test in each, and reports aggregated results.
#
# Usage:
#   ./scripts/test-api.sh              # run from the repo root
#   ./scripts/test-api.sh --no-install # skip npm install (faster re-runs)
# ─────────────────────────────────────────────────────────────────────────────

# Do NOT use set -e; we capture exit codes manually.
set -o pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

COMPONENTS=(
  "lambda/upload"
  "lambda/status"
  "lambda/process-file"
  "lambda/email"
  "lambda/accounts"
  "frontend"
)

# ── Flags ─────────────────────────────────────────────────────────────────────
SKIP_INSTALL=false
for arg in "$@"; do
  case "$arg" in
    --no-install) SKIP_INSTALL=true ;;
    --help|-h)
      echo "Usage: $0 [--no-install]"
      echo "  --no-install   Skip 'npm install' in each component (faster re-runs)"
      exit 0
      ;;
  esac
done

# ── Colours (disabled when stdout is not a terminal) ──────────────────────────
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  CYAN='\033[0;36m'
  BOLD='\033[1m'
  DIM='\033[2m'
  RESET='\033[0m'
else
  RED='' GREEN='' YELLOW='' CYAN='' BOLD='' DIM='' RESET=''
fi

# ── Tracking arrays ──────────────────────────────────────────────────────────
declare -a PASSED_COMPONENTS=()
declare -a FAILED_COMPONENTS=()
declare -a SKIPPED_COMPONENTS=()

TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_SUITE_FAILURES=0
START_TIME=$(date +%s)

# ── Helper functions ──────────────────────────────────────────────────────────
separator() {
  echo -e "${DIM}──────────────────────────────────────────────────────────────${RESET}"
}

banner() {
  echo ""
  separator
  echo -e "${CYAN}${BOLD}  $1${RESET}"
  separator
}

# Extract test counts from Jest or Vitest output.
# Outputs three numbers: passed failed suite_failures
parse_test_counts() {
  local output="$1"
  local passed=0 failed=0 suite_failures=0

  # ── Check for suite-level failures (compile errors, config issues) ──
  # Jest:   "Test Suites: 1 failed, 1 total"
  # Vitest: "Test Files  1 failed"
  local suite_line
  suite_line=$(echo "$output" | grep -iE "test (suites|files).*failed" | tail -1)
  if [ -n "$suite_line" ]; then
    suite_failures=$(echo "$suite_line" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || echo 0)
  fi

  # ── Extract individual test counts ──
  # Jest:   "Tests:  3 failed, 12 passed, 15 total"
  local jest_line
  jest_line=$(echo "$output" | grep -E "Tests:.*total" | tail -1)
  if [ -n "$jest_line" ]; then
    passed=$(echo "$jest_line" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo 0)
    failed=$(echo "$jest_line" | grep -oE '[0-9]+ failed'  | grep -oE '[0-9]+' || echo 0)
    echo "${passed:-0} ${failed:-0} ${suite_failures:-0}"
    return
  fi

  # Vitest: "Tests  12 failed | 149 passed (161)"
  local vitest_line
  vitest_line=$(echo "$output" | grep -E "Tests.*passed" | tail -1)
  if [ -n "$vitest_line" ]; then
    passed=$(echo "$vitest_line" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo 0)
    failed=$(echo "$vitest_line" | grep -oE '[0-9]+ failed'  | grep -oE '[0-9]+' || echo 0)
    echo "${passed:-0} ${failed:-0} ${suite_failures:-0}"
    return
  fi

  echo "0 0 ${suite_failures:-0}"
}

# ── Main loop ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Libra Test Suite${RESET}"
echo -e "${DIM}Running tests across ${#COMPONENTS[@]} components${RESET}"

for component in "${COMPONENTS[@]}"; do
  component_dir="$REPO_ROOT/$component"
  display_name="$component"

  banner "$display_name"

  # ── Guard: directory exists? ──
  if [ ! -d "$component_dir" ]; then
    echo -e "  ${YELLOW}⚠  Directory not found — skipping${RESET}"
    SKIPPED_COMPONENTS+=("$display_name (directory missing)")
    continue
  fi

  # ── Guard: package.json exists? ──
  if [ ! -f "$component_dir/package.json" ]; then
    echo -e "  ${YELLOW}⚠  No package.json — skipping${RESET}"
    SKIPPED_COMPONENTS+=("$display_name (no package.json)")
    continue
  fi

  # ── Guard: test script exists? ──
  has_test_script=$(node -e "
    const pkg = require('$component_dir/package.json');
    console.log(pkg.scripts && pkg.scripts.test ? 'yes' : 'no');
  " 2>/dev/null || echo "no")

  if [ "$has_test_script" = "no" ]; then
    echo -e "  ${YELLOW}⚠  No \"test\" script in package.json — skipping${RESET}"
    SKIPPED_COMPONENTS+=("$display_name (no test script)")
    continue
  fi

  cd "$component_dir"

  # ── npm install ──
  if [ "$SKIP_INSTALL" = false ]; then
    echo -e "  ${DIM}Installing dependencies…${RESET}"
    if ! npm install --silent 2>&1 | tail -1; then
      echo -e "  ${RED}✗  npm install failed${RESET}"
      FAILED_COMPONENTS+=("$display_name (install failed)")
      continue
    fi
  fi

  # ── npm test ──
  echo -e "  ${DIM}Running tests…${RESET}"
  echo ""

  # Capture output AND the real exit code — no || true.
  test_output=$(npm test -- --no-coverage 2>&1)
  exit_code=$?

  # Show the output
  echo "$test_output"
  echo ""

  # Parse results
  read -r comp_passed comp_failed comp_suite_failures <<< "$(parse_test_counts "$test_output")"
  comp_passed=${comp_passed:-0}
  comp_failed=${comp_failed:-0}
  comp_suite_failures=${comp_suite_failures:-0}
  comp_total=$((comp_passed + comp_failed))

  TOTAL_TESTS=$((TOTAL_TESTS + comp_total))
  TOTAL_PASSED=$((TOTAL_PASSED + comp_passed))
  TOTAL_FAILED=$((TOTAL_FAILED + comp_failed))
  TOTAL_SUITE_FAILURES=$((TOTAL_SUITE_FAILURES + comp_suite_failures))

  # A component FAILS if:
  #   - npm test exited non-zero, OR
  #   - any individual tests failed, OR
  #   - any test suites failed to compile/run (0 tests but suite error)
  if [ "$exit_code" -ne 0 ] || [ "$comp_failed" -gt 0 ] || [ "$comp_suite_failures" -gt 0 ]; then
    local_detail=""
    if [ "$comp_suite_failures" -gt 0 ] && [ "$comp_failed" -eq 0 ]; then
      local_detail=" (${comp_suite_failures} suite(s) failed to compile/run)"
    elif [ "$comp_failed" -gt 0 ]; then
      local_detail=" (${comp_passed} passed, ${comp_failed} failed)"
    fi
    echo -e "  ${RED}✗  ${display_name}${local_detail}${RESET}"
    FAILED_COMPONENTS+=("$display_name")
  else
    echo -e "  ${GREEN}✓  ${display_name}: ${comp_passed} passed${RESET}"
    PASSED_COMPONENTS+=("$display_name")
  fi

  cd "$REPO_ROOT"
done

# ── Aggregated Summary ────────────────────────────────────────────────────────
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED / 60))
SECONDS=$((ELAPSED % 60))

echo ""
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  TEST SUITE SUMMARY${RESET}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${RESET}"
echo ""

if [ ${#PASSED_COMPONENTS[@]} -gt 0 ]; then
  echo -e "  ${GREEN}${BOLD}Passed (${#PASSED_COMPONENTS[@]}):${RESET}"
  for c in "${PASSED_COMPONENTS[@]}"; do
    echo -e "    ${GREEN}✓${RESET}  $c"
  done
  echo ""
fi

if [ ${#FAILED_COMPONENTS[@]} -gt 0 ]; then
  echo -e "  ${RED}${BOLD}Failed (${#FAILED_COMPONENTS[@]}):${RESET}"
  for c in "${FAILED_COMPONENTS[@]}"; do
    echo -e "    ${RED}✗${RESET}  $c"
  done
  echo ""
fi

if [ ${#SKIPPED_COMPONENTS[@]} -gt 0 ]; then
  echo -e "  ${YELLOW}${BOLD}Skipped (${#SKIPPED_COMPONENTS[@]}):${RESET}"
  for c in "${SKIPPED_COMPONENTS[@]}"; do
    echo -e "    ${YELLOW}⚠${RESET}  $c"
  done
  echo ""
fi

separator
echo -e "  ${BOLD}Tests:${RESET}            ${TOTAL_PASSED} passed, ${TOTAL_FAILED} failed, $((TOTAL_PASSED + TOTAL_FAILED)) total"
if [ "$TOTAL_SUITE_FAILURES" -gt 0 ]; then
  echo -e "  ${BOLD}Suite failures:${RESET}   ${RED}${TOTAL_SUITE_FAILURES} suite(s) failed to compile/run${RESET}"
fi
echo -e "  ${BOLD}Components:${RESET}       ${#PASSED_COMPONENTS[@]} passed, ${#FAILED_COMPONENTS[@]} failed, ${#SKIPPED_COMPONENTS[@]} skipped"
echo -e "  ${BOLD}Duration:${RESET}         ${MINUTES}m ${SECONDS}s"
separator
echo ""

# ── Exit code ─────────────────────────────────────────────────────────────────
if [ ${#FAILED_COMPONENTS[@]} -gt 0 ]; then
  exit 1
fi
exit 0