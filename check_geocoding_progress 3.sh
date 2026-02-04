#!/bin/bash
# Monitor geocoding progress

echo "🔍 Geocoding Progress Monitor"
echo "=============================="
echo ""

# Check if process is running
if ps aux | grep "node add_coordinates" | grep -v grep > /dev/null; then
    echo "✅ Status: Running"
else
    echo "⏹️  Status: Completed or Stopped"
fi

echo ""

# Get current progress from log
if [ -f geocoding.log ]; then
    LAST_LINE=$(tail -1 geocoding.log)
    echo "📊 Latest: $LAST_LINE"
    echo ""
    
    # Extract progress numbers
    PROGRESS=$(grep "Progress:" geocoding.log | tail -1 | grep -oP '\d+/\d+')
    if [ ! -z "$PROGRESS" ]; then
        CURRENT=$(echo $PROGRESS | cut -d'/' -f1)
        TOTAL=$(echo $PROGRESS | cut -d'/' -f2)
        PERCENT=$(echo "scale=1; $CURRENT * 100 / $TOTAL" | bc)
        echo "📈 Progress: $CURRENT/$TOTAL ($PERCENT%)"
        
        # Estimate time remaining (assuming 1 second per destination)
        REMAINING=$((TOTAL - CURRENT))
        MINUTES=$((REMAINING / 60))
        echo "⏱️  Estimated time remaining: ~$MINUTES minutes"
    fi
fi

echo ""
echo "💡 Run this script again to check progress"
echo "   ./check_geocoding_progress.sh"

