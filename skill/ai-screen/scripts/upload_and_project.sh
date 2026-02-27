#!/bin/bash
# 上传文件并投影到屏幕
# Usage: upload_and_project.sh <screen_id> <file>

set -e

: "${AI_SCREEN_URL:?"AI_SCREEN_URL not set"}"
: "${AI_SCREEN_TOKEN:?"AI_SCREEN_TOKEN not set"}"

SCREEN_ID=$1
FILE=$2

if [ -z "$SCREEN_ID" ] || [ -z "$FILE" ]; then
  echo "Usage: $0 <screen_id> <file>"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "File not found: $FILE"
  exit 1
fi

echo "Uploading $FILE..."

# 上传文件
UPLOAD_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $AI_SCREEN_TOKEN" \
  -F "file=@$FILE" \
  "$AI_SCREEN_URL/api/attachments")

# 提取 attachment URL
ATTACHMENT_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.attachment.url')

if [ -z "$ATTACHMENT_URL" ] || [ "$ATTACHMENT_URL" = "null" ]; then
  echo "Upload failed:"
  echo "$UPLOAD_RESPONSE" | jq .
  exit 1
fi

echo "Uploaded successfully: $ATTACHMENT_URL"
echo "Projecting to screen $SCREEN_ID..."

# 投影附件
curl -s -X POST \
  -H "Authorization: Bearer $AI_SCREEN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\": \"iframe\", \"content\": \"\", \"attachment_url\": \"$ATTACHMENT_URL\"}" \
  "$AI_SCREEN_URL/api/screens/$SCREEN_ID/project" | jq .
