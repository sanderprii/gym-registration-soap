#!/bin/bash

# run.sh - Start script for Gym Registration SOAP Service

set -e

echo "Starting Gym Registration SOAP Service..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 16+ to continue."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install npm to continue."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "Please edit the .env file with your configuration before running again."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "Running database migrations..."
npx prisma migrate dev --name init

# Start the REST API in background (if not already running)
echo "Starting REST API server..."
if ! pgrep -f "node server.js" > /dev/null; then
    node server.js &
    REST_PID=$!
    echo "REST API started with PID: $REST_PID"
    # Wait a moment for the REST API to start
    sleep 2
else
    echo "REST API is already running"
fi

# Start the SOAP service
echo "Starting SOAP service..."
if [ -f src/soap_server.js ]; then
    node src/soap_server.js &
    SOAP_PID=$!
    echo "SOAP service started with PID: $SOAP_PID"
else
    echo "Error: SOAP server file not found at src/soap_server.js"
    exit 1
fi

# Create a simple process monitor script
cat > stop_services.sh << 'EOF'
#!/bin/bash
echo "Stopping services..."

# Stop SOAP service
if [ ! -z "$SOAP_PID" ] && kill -0 $SOAP_PID 2>/dev/null; then
    kill $SOAP_PID
    echo "SOAP service stopped"
fi

# Stop REST API if we started it
if [ ! -z "$REST_PID" ] && kill -0 $REST_PID 2>/dev/null; then
    kill $REST_PID
    echo "REST API stopped"
fi

# Also kill by name in case PID tracking failed
pkill -f "soap_server.js" 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true

echo "All services stopped"
EOF

chmod +x stop_services.sh

echo ""
echo "=== Gym Registration SOAP Service Started ==="
echo "REST API: http://localhost:3000"
echo "SOAP Service: http://localhost:3001/soap"
echo "WSDL: http://localhost:3001/soap?wsdl"
echo ""
echo "Press Ctrl+C to stop all services, or run ./stop_services.sh"
echo "=== Services are running ==="

# Wait for Ctrl+C
trap './stop_services.sh' INT

# Keep the script running
wait