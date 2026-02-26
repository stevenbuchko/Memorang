#!/bin/bash

# ===========================================
# Forge — Ralph Loop
# Autonomous Development with Claude Code
# ===========================================

# Configuration
MAX_ITERATIONS=25          # Safety limit per run
SLEEP_BETWEEN=5            # Seconds between iterations
MAX_TURNS=75               # Max tool uses per Claude session
TASKS_FILE="docs/PROJECT-1-TASKS.md"  # Current project task file

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}=========================================="
echo "Memorang — Ralph Loop Starting"
echo "==========================================${NC}"
echo "Tasks File: $TASKS_FILE"
echo "Max Iterations: $MAX_ITERATIONS"
echo "Max Turns per Iteration: $MAX_TURNS"
echo "=========================================="
echo ""

# Pre-flight check
if [ ! -f "PROMPT.md" ]; then
    echo -e "${RED}ERROR: PROMPT.md not found. Are you in the project root?${NC}"
    exit 1
fi

if [ ! -f "$TASKS_FILE" ]; then
    echo -e "${RED}ERROR: $TASKS_FILE not found.${NC}"
    exit 1
fi

# Initialize activity.md if it doesn't exist
if [ ! -f "activity.md" ]; then
    echo "# Memorang Development Activity Log" > activity.md
    echo "" >> activity.md
    echo "---" >> activity.md
    echo "" >> activity.md
fi

ITERATION=0

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

    echo ""
    echo -e "${YELLOW}=== Iteration $ITERATION of $MAX_ITERATIONS ===${NC}"
    echo "Started: $TIMESTAMP"
    echo ""

    # Kill any lingering Expo processes to free ports
    pkill -f "expo start" 2>/dev/null || true
    sleep 1

    # Build the prompt by injecting PROMPT.md content + current task file reference
    PROMPT_CONTENT=$(cat PROMPT.md)

    # Only feed recent activity to avoid context window bloat
    RECENT_ACTIVITY=$(tail -30 activity.md)

    claude -p "${PROMPT_CONTENT}

---

CURRENT TASK FILE: ${TASKS_FILE}

RECENT ACTIVITY (last 30 lines of activity.md):
${RECENT_ACTIVITY}

Read the task file, then work on exactly ONE [AUTO] task. When done, update the task file, update activity.md, and git commit." \
    --max-turns $MAX_TURNS \

    EXIT_CODE=$?

    # Check exit code
    if [ $EXIT_CODE -ne 0 ]; then
        echo -e "${RED}Claude exited with code $EXIT_CODE${NC}"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Iteration $ITERATION: EXIT CODE $EXIT_CODE" >> activity.md
    fi

    # Check for completion signals (only check last 5 lines to avoid old entries)
    if tail -5 activity.md | grep -q "PROJECT_COMPLETE"; then
        echo ""
        echo -e "${GREEN}Project complete!${NC}"
        echo "Review the results, then update TASKS_FILE to the next project."
        exit 0
    fi

    if grep -q "BLOCKED" activity.md 2>/dev/null; then
        # Only check the last 5 lines to avoid false positives from old entries
        if tail -5 activity.md | grep -q "BLOCKED"; then
            echo ""
            echo -e "${RED}Agent is BLOCKED. Check activity.md for details.${NC}"
            echo "This usually means a [MANUAL] step is needed."
            exit 1
        fi
    fi

    echo ""
    echo -e "${CYAN}Sleeping $SLEEP_BETWEEN seconds before next iteration...${NC}"
    sleep $SLEEP_BETWEEN

done

echo ""
echo -e "${YELLOW}Max iterations ($MAX_ITERATIONS) reached.${NC}"
echo "Progress saved in activity.md. Run again to continue."