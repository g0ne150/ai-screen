#!/bin/bash
# 列出所有屏幕

set -e

: "${AI_SCREEN_URL:?"AI_SCREEN_URL not set"}"
: "${AI_SCREEN_TOKEN:?"AI_SCREEN_TOKEN not set"}"

curl -s -H "Authorization: Bearer $AI_SCREEN_TOKEN" \
  "$AI_SCREEN_URL/api/screens" | jq .
