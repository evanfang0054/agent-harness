#!/usr/bin/env bash
# trace-analyzer.sh - Analyze failure patterns from learnings.jsonl
#
# Usage:
#   trace-analyzer.sh [project_root]
#
# Input:
#   .agent-harness/learnings.jsonl
#   docs/agent-harness/specs/ (optional)
#   /tmp/agent-harness-edit-tracker/ (optional)
#
# Output:
#   Structured text report with failure patterns, trends, recommendations

set -euo pipefail

PROJECT_ROOT="${1:-.}"
LEARNINGS_FILE="${PROJECT_ROOT}/.agent-harness/learnings.jsonl"

if [ ! -f "${LEARNINGS_FILE}" ]; then
    echo "=== Trace Analysis Report ==="
    echo ""
    echo "No learnings file found at ${LEARNINGS_FILE}"
    echo "Cannot analyze failure patterns without data."
    echo ""
    echo "Recommendation: Use agent-harness:session-learnings to start recording."
    exit 0
fi

echo "=== Trace Analysis Report ==="
echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Pattern classification keywords
echo "Top Failure Patterns:"
echo ""

LEARNINGS_FILE="${LEARNINGS_FILE}" python3 <<'PYEOF'
import json
import os
import sys
from collections import Counter, defaultdict

learnings_file = os.environ["LEARNINGS_FILE"]
learnings = []

with open(learnings_file) as f:
    for line in f:
        line = line.strip()
        if line:
            try:
                learnings.append(json.loads(line))
            except json.JSONDecodeError:
                continue

# Classify patterns by keywords in key/insight
def classify_pattern(entry):
    text = (entry.get("key", "") + " " + entry.get("insight", "")).lower()
    if any(w in text for w in ["loop", "repeat", "doom", "stuck"]):
        return "loop"
    if any(w in text for w in ["drift", "off-track", "wander"]):
        return "drift"
    if any(w in text for w in ["oversight", "miss", "forgot", "skipped"]):
        return "oversight"
    if any(w in text for w in ["scope", "creep", "extra", "unrequest"]):
        return "scope-creep"
    if any(w in text for w in ["verify", "verification", "claim", "false"]):
        return "verification-gap"
    return "other"

pattern_counts = Counter()
pattern_examples = defaultdict(list)

for entry in learnings:
    pattern = classify_pattern(entry)
    pattern_counts[pattern] += 1
    if len(pattern_examples[pattern]) < 3:
        pattern_examples[pattern].append(entry.get("key", "?"))

for pattern, count in pattern_counts.most_common():
    examples = ", ".join(pattern_examples[pattern][:3])
    print(f"  [{pattern}] {count} occurrences — examples: {examples}")

print("")
print("Recommendations:")
print("")

# Generate recommendations based on patterns
rec_num = 1
if pattern_counts.get("loop", 0) > 0:
    print(f"  {rec_num}. Enable loop-detection in verification-before-completion")
    rec_num += 1
if pattern_counts.get("verification-gap", 0) > 0:
    print(f"  {rec_num}. Configure computational-sensors for deterministic verification")
    rec_num += 1
if pattern_counts.get("scope-creep", 0) > 0:
    print(f"  {rec_num}. Use sprint-contract to lock scope before implementation")
    rec_num += 1
if pattern_counts.get("oversight", 0) > 0:
    print(f"  {rec_num}. Add verification checklists for common oversight patterns")
    rec_num += 1
if pattern_counts.get("drift", 0) > 0:
    print(f"  {rec_num}. Use writing-plans with explicit task boundaries")
    rec_num += 1

print("")
print(f"Total learnings analyzed: {len(learnings)}")
PYEOF
