#!/usr/bin/env bash
# coverage-metrics.sh - Measure harness coverage across dimensions
#
# Usage:
#   coverage-metrics.sh [project_root]
#
# Dimensions measured:
#   - Feedforward skill coverage
#   - Feedback skill coverage
#   - Computational sensor coverage
#   - Loop detection enabled
#   - Sprint contract usage
#   - Reasoning budget coverage

set -euo pipefail

PROJECT_ROOT="${1:-.}"
SKILLS_DIR="${PROJECT_ROOT}/skills"
SENSORS_FILE="${PROJECT_ROOT}/.superpowers/sensors.json"
CONTRACTS_DIR="${PROJECT_ROOT}/docs/superpowers/contracts"

echo "=== Harness Coverage Report ==="
echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Count skills with when_to_use tags
ff_count=$(grep -rl "\[feedforward\]" "${SKILLS_DIR}"/*/SKILL.md 2>/dev/null | wc -l | tr -d ' ' || true)
fb_count=$(grep -rl "\[feedback\]" "${SKILLS_DIR}"/*/SKILL.md 2>/dev/null | wc -l | tr -d ' ' || true)
total_skills=$(ls -d "${SKILLS_DIR}"/*/ 2>/dev/null | wc -l | tr -d ' ')

echo "Feedforward Coverage:     ${ff_count} skills labeled"
echo "Feedback Coverage:        ${fb_count} skills labeled"
echo "Total Skills:             ${total_skills}"
echo ""

# Sensor coverage
if [ -f "${SENSORS_FILE}" ]; then
    sensor_count=$(python3 -c "import json; print(len(json.load(open('${SENSORS_FILE}'))['sensors']))" 2>/dev/null || echo "?")
    echo "Computational Sensors:   ${sensor_count} configured"
else
    echo "Computational Sensors:   NOT CONFIGURED (.superpowers/sensors.json missing)"
fi

# Loop detection
if [ -f "${PROJECT_ROOT}/scripts/loop-detector.sh" ]; then
    echo "Loop Detection:          ENABLED"
else
    echo "Loop Detection:          DISABLED"
fi

# Sprint contract usage
if [ -d "${CONTRACTS_DIR}" ]; then
    contract_count=$(ls "${CONTRACTS_DIR}"/*.contract.md 2>/dev/null | wc -l | tr -d ' ')
    echo "Sprint Contracts:        ${contract_count} files"
else
    echo "Sprint Contracts:        0 files (directory not created)"
fi

# Reasoning budget
effort_count=$(grep -rl "^effort:" "${SKILLS_DIR}"/*/SKILL.md 2>/dev/null | wc -l | tr -d ' ' || true)
echo "Reasoning Budget:         ${effort_count} skills configured"
echo ""
echo "=== Gaps ==="

if [ ! -f "${SENSORS_FILE}" ]; then
    echo "- Missing sensors.json (run /harness-init or /computational-sensors)"
fi
if [ ! -d "${CONTRACTS_DIR}" ]; then
    echo "- No sprint contracts directory (run /sprint-contract for next feature)"
fi
if [ "${effort_count}" -lt 7 ]; then
    echo "- Only ${effort_count}/7 recommended skills have effort configured"
fi
