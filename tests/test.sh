#!/bin/bash

echo "Running automated tests for SOAP service..."

# Check if SOAP service is running
echo "Checking if SOAP service is running..."
if ! curl -f http://localhost:3001/soap?wsdl > /dev/null 2>&1; then
    echo "Error: SOAP service is not running on port 3001"
    echo "Please start it with: npm start"
    exit 1
fi

# Check if REST service is running
echo "Checking if REST service is running..."
if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "Warning: REST service is not running on port 3000"
    echo "Some comparison tests will be skipped"
    echo "To run REST service: cd ../gym-registration-api && npm start"
fi

# Run Node.js tests
echo "Running comparison tests..."
cd "$(dirname "$0")"
node test.js

if [ $? -eq 0 ]; then
    echo "✓ All tests passed successfully!"
    exit 0
else
    echo "✗ Some tests failed!"
    exit 1
fi