#!/bin/bash
cd "$(dirname "$0")"

echo "Starting server..."
(cd server && node index.js) &
SERVER_PID=$!

echo "Starting client..."
(cd client && npm run dev) &
CLIENT_PID=$!

echo "$SERVER_PID" > .server.pid
echo "$CLIENT_PID" > .client.pid

echo "Server PID: $SERVER_PID"
echo "Client PID: $CLIENT_PID"
echo ""
echo "Waiting for services to start..."

SERVER_OK=0
CLIENT_OK=0

for i in $(seq 1 15); do
  if [ $SERVER_OK -eq 0 ] && curl --noproxy localhost -s http://localhost:3001 >/dev/null 2>&1; then
    SERVER_OK=1
  fi
  if [ $CLIENT_OK -eq 0 ] && curl --noproxy localhost -s http://localhost:5173 >/dev/null 2>&1; then
    CLIENT_OK=1
  fi
  if [ $SERVER_OK -eq 1 ] && [ $CLIENT_OK -eq 1 ]; then
    break
  fi
  sleep 1
done

echo ""
echo "=============================="
if [ $SERVER_OK -eq 1 ] && [ $CLIENT_OK -eq 1 ]; then
  echo "  All services started successfully!"
  echo "  Server: http://localhost:3001"
  echo "  Client: http://localhost:5173"
else
  if [ $SERVER_OK -eq 0 ]; then
    echo "  [FAILED] Server failed to start on port 3001"
  else
    echo "  [OK] Server started on port 3001"
  fi
  if [ $CLIENT_OK -eq 0 ]; then
    echo "  [FAILED] Client failed to start on port 5173"
  else
    echo "  [OK] Client started on port 5173"
  fi
  echo ""
  echo "  Please check the logs above for errors."
fi
echo "=============================="
echo ""
