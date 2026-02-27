#!/bin/bash
# 投影 HTML 内容到屏幕
# Usage: project_html.sh <screen_id> <html_file>

set -e

: "${AI_SCREEN_URL:?"AI_SCREEN_URL not set"}"
: "${AI_SCREEN_TOKEN:?"AI_SCREEN_TOKEN not set"}"

SCREEN_ID=$1
HTML_FILE=$2

if [ -z "$SCREEN_ID" ] || [ -z "$HTML_FILE" ]; then
  echo "Usage: $0 <screen_id> <html_file>"
  exit 1
fi

if [ ! -f "$HTML_FILE" ]; then
  echo "File not found: $HTML_FILE"
  exit 1
fi

# 读取文件内容并转义为 JSON 字符串
CONTENT=$(cat "$HTML_FILE" | jq -Rs '.')

curl -s -X POST \
  -H "Authorization: Bearer $AI_SCREEN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\": \"inline_html\", \"content\": $CONTENT}" \
  "$AI_SCREEN_URL/api/screens/$SCREEN_ID/project" | jq .
