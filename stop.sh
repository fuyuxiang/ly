#!/bin/bash
cd "$(dirname "$0")"

if [ -f .server.pid ]; then
    SERVER_PID=$(cat .server.pid)
    if kill -0 "$SERVER_PID" 2>/dev/null; then
        kill "$SERVER_PID"
        echo "Server (PID $SERVER_PID) stopped."
    else
        echo "Server process not running."
    fi
    rm -f .server.pid
else
    echo "No server PID file found."
fi

if [ -f .client.pid ]; then
    CLIENT_PID=$(cat .client.pid)
    if kill -0 "$CLIENT_PID" 2>/dev/null; then
        kill "$CLIENT_PID"
        echo "Client (PID $CLIENT_PID) stopped."
    else
        echo "Client process not running."
    fi
    rm -f .client.pid
else
    echo "No client PID file found."
fi

# Kill any remaining processes on the ports as fallback
lsof -ti :3001 | xargs kill -9 2>/dev/null
lsof -ti :5173 | xargs kill -9 2>/dev/null

echo "All services stopped."
