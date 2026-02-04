#!/bin/bash

echo "Testing AI Search on Live Site"
echo "================================"
echo ""

queries=(
  "restaurant in tokyo"
  "hotel in tokyo"
  "where to eat in tokyo"
  "cute cafe in paris"
  "luxury hotel tokyo"
  "michelin 3 star restaurant tokyo"
  "romantic dinner paris"
  "hotl in tokio"
)

for query in "${queries[@]}"; do
  echo "Query: \"$query\""
  result=$(curl -s -X POST "https://www.urbanmanual.co/api/search" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$query\", \"pageSize\": 3}")
  
  count=$(echo "$result" | python3.11 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('results', [])))")
  tier=$(echo "$result" | python3.11 -c "import sys, json; data=json.load(sys.stdin); print(data.get('searchTier', 'unknown'))")
  
  echo "  Results: $count"
  echo "  Tier: $tier"
  echo ""
done
