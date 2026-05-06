#!/bin/bash
cd "$(dirname "$0")"

echo "Restarting services..."
bash stop.sh
sleep 1
bash start.sh
