#!/bin/bash

# Library Catalog API Test Script
# Usage: ./test-api.sh <API_URL>

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <API_URL>"
    echo "Example: $0 https://abc123.execute-api.us-east-1.amazonaws.com/prod"
    exit 1
fi

API_URL=$1
BASE_URL="${API_URL%/}"  # Remove trailing slash if present

echo "Testing Library Catalog API at: $BASE_URL"
echo "=================================================="

# Test 1: Upload endpoint with valid request
echo "Test 1: POST /upload (valid request)"
UPLOAD_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test-catalog.csv",
    "fileSize": 1024,
    "settings": {
      "priceRounding": true,
      "priceAdjustment": 2.50
    }
  }' \
  "$BASE_URL/upload")

echo "Response: $UPLOAD_RESPONSE"

# Extract jobId from response
JOB_ID=$(echo $UPLOAD_RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
echo "Extracted Job ID: $JOB_ID"
echo ""

# Test 2: Upload endpoint with invalid file type
echo "Test 2: POST /upload (invalid file type)"
INVALID_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.txt",
    "fileSize": 1024,
    "settings": {
      "priceRounding": true
    }
  }' \
  "$BASE_URL/upload")

echo "Response: $INVALID_RESPONSE"
echo ""

# Test 3: Upload endpoint with file too large
echo "Test 3: POST /upload (file too large)"
LARGE_FILE_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "large.csv",
    "fileSize": 104857600,
    "settings": {
      "priceRounding": false
    }
  }' \
  "$BASE_URL/upload")

echo "Response: $LARGE_FILE_RESPONSE"
echo ""

# Test 4: Status endpoint with valid job ID
if [ ! -z "$JOB_ID" ]; then
    echo "Test 4: GET /status/$JOB_ID (valid job ID)"
    STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/status/$JOB_ID")
    echo "Response: $STATUS_RESPONSE"
    echo ""
fi

# Test 5: Status endpoint with invalid job ID
echo "Test 5: GET /status/invalid-job-id (invalid job ID)"
INVALID_STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/status/invalid-job-id")
echo "Response: $INVALID_STATUS_RESPONSE"
echo ""

# Test 6: CORS preflight request
echo "Test 6: OPTIONS /upload (CORS preflight)"
CORS_RESPONSE=$(curl -s -X OPTIONS \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v "$BASE_URL/upload" 2>&1)

echo "Response headers:"
echo "$CORS_RESPONSE" | grep -i "access-control"
echo ""

echo "API Testing Complete!"
echo "=================================================="

# Test file upload flow (if curl supports it)
if command -v dd &> /dev/null && [ ! -z "$JOB_ID" ]; then
    echo ""
    echo "Optional: Test complete upload flow"
    echo "1. Creating test CSV file..."
    
    # Create a small test CSV
    cat > test-catalog.csv << EOF
isbn,title,author,basePrice
9781234567890,Test Book 1,Test Author 1,19.99
9780987654321,Test Book 2,Test Author 2,24.95
EOF
    
    echo "2. Getting upload URL..."
    UPLOAD_URL=$(echo $UPLOAD_RESPONSE | grep -o '"uploadUrl":"[^"]*"' | cut -d'"' -f4)
    
    if [ ! -z "$UPLOAD_URL" ]; then
        echo "3. Uploading file to S3..."
        curl -X PUT \
          -H "Content-Type: text/csv" \
          --data-binary @test-catalog.csv \
          "$UPLOAD_URL"
        
        echo ""
        echo "4. File uploaded! Check status endpoint for processing updates."
        echo "   curl -X GET $BASE_URL/status/$JOB_ID"
        
        # Cleanup
        rm -f test-catalog.csv
    else
        echo "Could not extract upload URL"
    fi
fi
