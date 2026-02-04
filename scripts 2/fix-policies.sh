#!/bin/bash
# Add DROP POLICY IF EXISTS before all CREATE POLICY statements

sed -i.bak 's/^CREATE POLICY /DROP POLICY IF EXISTS /; s/ ON \([^ ]*\)$/ ON \1;\nCREATE POLICY /' APPLY_ALL_REMAINING_MIGRATIONS.sql

echo "⚠️  This approach won't work well. Better to do it manually."
