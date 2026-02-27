#!/bin/bash
# 确认注册屏幕
# Usage: confirm_screen.sh <screen_id> <name_en> <name_zh>

set -e

: "${AI_SCREEN_URL:?"AI_SCREEN_URL not set"}"
: "${AI_SCREEN_TOKEN:?"AI_SCREEN_TOKEN not set"}"

SCREEN_ID=$1
NAME_EN=$2
NAME_ZH=$3

if [ -z "$SCREEN_ID" ] || [ -z "$NAME_EN" ] || [ -z "$NAME_ZH" ]; then
  echo "Usage: $0 <screen_id> <name_en> <name_zh>"
  exit 1
fi

curl -s -X POST \
  -H "Authorization: Bearer $AI_SCREEN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name_en\": \"$NAME_EN\", \"name_zh\": \"$NAME_ZH\"}" \
  "$AI_SCREEN_URL/api/screens/$SCREEN_ID/confirm" | jq .
