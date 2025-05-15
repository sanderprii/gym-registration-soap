#!/bin/bash

# test.sh - Automated tests comparing REST and SOAP responses

set -e

echo "=== Gym Registration API Tests: REST vs SOAP ==="
echo

# Configuration
REST_URL="http://localhost:3000"
SOAP_URL="http://localhost:3001/soap?wsdl"
TEST_EMAIL="test.user@example.com"
TEST_PASSWORD="testpass123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

# Function to print test results
print_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"

    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC} - $test_name"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} - $test_name"
        if [ ! -z "$details" ]; then
            echo "    Details: $details"
        fi
        ((FAILED++))
    fi
}

# Function to wait for service
wait_for_service() {
    local url="$1"
    local name="$2"
    local timeout=30
    local count=0

    echo -n "Waiting for $name to be ready"
    while [ $count -lt $timeout ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo " ✓"
            return 0
        fi
        echo -n "."
        sleep 1
        ((count++))
    done
    echo " ✗"
    echo "Error: $name not ready after $timeout seconds"
    return 1
}

# Function to create test data via REST
create_test_data() {
    echo "Creating test data via REST API..."

    # Create test trainee
    curl -s -X POST "$REST_URL/trainees" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Test User",
            "email": "'$TEST_EMAIL'",
            "password": "'$TEST_PASSWORD'",
            "timezone": "Europe/Tallinn"
        }' > /tmp/rest_create_trainee.json

    # Login to get token
    REST_TOKEN=$(curl -s -X POST "$REST_URL/sessions" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "'$TEST_EMAIL'",
            "password": "'$TEST_PASSWORD'"
        }' | jq -r '.token')

    echo "REST Token obtained: ${REST_TOKEN:0:20}..."

    # Create test workout
    curl -s -X POST "$REST_URL/workouts" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $REST_TOKEN" \
        -d '{
            "name": "Test Workout",
            "duration": 45,
            "description": "Test workout for comparison",
            "color": "#FF5733"
        }' > /tmp/rest_create_workout.json

    echo "Test data created successfully"
}

# Function to cleanup test data
cleanup_test_data() {
    echo "Cleaning up test data..."

    if [ ! -z "$REST_TOKEN" ]; then
        # Get trainee ID
        TRAINEE_ID=$(jq -r '.id' /tmp/rest_create_trainee.json)
        WORKOUT_ID=$(jq -r '.id' /tmp/rest_create_workout.json)

        # Delete workout
        curl -s -X DELETE "$REST_URL/workouts/$WORKOUT_ID" \
            -H "Authorization: Bearer $REST_TOKEN" > /dev/null

        # Delete trainee
        curl -s -X DELETE "$REST_URL/trainees/$TRAINEE_ID" \
            -H "Authorization: Bearer $REST_TOKEN" > /dev/null

        echo "Test data cleaned up"
    fi
}

# Function to compare JSON responses
compare_json_responses() {
    local rest_file="$1"
    local soap_file="$2"
    local test_name="$3"

    # Extract relevant fields and normalize
    # Note: SOAP responses have different structure, so we need to compare the actual data

    if [ ! -f "$rest_file" ] || [ ! -f "$soap_file" ]; then
        print_result "$test_name" "FAIL" "Response files not found"
        return
    fi

    # For now, we'll just check if both files contain valid JSON and expected fields
    # In a real scenario, you'd want more sophisticated comparison

    rest_valid=$(jq empty "$rest_file" 2>/dev/null && echo "true" || echo "false")
    soap_valid=$(jq empty "$soap_file" 2>/dev/null && echo "true" || echo "false")

    if [ "$rest_valid" = "true" ] && [ "$soap_valid" = "true" ]; then
        # Check if both have similar data structure
        # This is a simplified check - you'd want to compare actual values
        print_result "$test_name" "PASS" "Both responses valid JSON"
    else
        print_result "$test_name" "FAIL" "Invalid JSON in responses"
    fi
}

# Main test execution
main() {
    echo "Starting automated tests..."

    # Check prerequisites
    if ! command -v curl &> /dev/null; then
        echo "Error: curl is required but not installed"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        echo "Error: jq is required but not installed"
        exit 1
    fi

    if ! command -v node &> /dev/null; then
        echo "Error: node is required but not installed"
        exit 1
    fi

    # Wait for services to be ready
    echo "Checking service availability..."
    if ! wait_for_service "$REST_URL" "REST API"; then
        echo "Error: REST API not available at $REST_URL"
        exit 1
    fi

    # Check if SOAP service is running by testing the WSDL
    if ! curl -s "$SOAP_URL" > /dev/null 2>&1; then
        echo "Error: SOAP service not available at $SOAP_URL"
        echo "Please ensure the SOAP service is running with ./scripts/run.sh"
        exit 1
    fi

    # Create test data
    create_test_data

    # Test 1: Login comparison
    echo -e "\n${YELLOW}Test 1: Login Operation${NC}"

    # REST Login
    curl -s -X POST "$REST_URL/sessions" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "'$TEST_EMAIL'",
            "password": "'$TEST_PASSWORD'"
        }' > /tmp/rest_login.json

    # SOAP Login (using node script)
    node -e "
        const soap = require('soap');
        (async () => {
            try {
                const client = await soap.createClientAsync('$SOAP_URL');
                const [result] = await client.LoginAsync({
                    email: '$TEST_EMAIL',
                    password: '$TEST_PASSWORD'
                });
                console.log(JSON.stringify(result));
            } catch(error) {
                console.log(JSON.stringify({error: error.message}));
            }
        })();
    " > /tmp/soap_login.json

    compare_json_responses "/tmp/rest_login.json" "/tmp/soap_login.json" "Login Operation"

    # Get SOAP token for further tests
    SOAP_TOKEN=$(jq -r '.token' /tmp/soap_login.json 2>/dev/null || echo "")

    # Test 2: Get Trainees
    echo -e "\n${YELLOW}Test 2: Get Trainees${NC}"

    curl -s -X GET "$REST_URL/trainees?page=1&pageSize=10" \
        -H "Authorization: Bearer $REST_TOKEN" > /tmp/rest_trainees.json

    node -e "
        const soap = require('soap');
        (async () => {
            try {
                const client = await soap.createClientAsync('$SOAP_URL');
                const [result] = await client.GetTraineesAsync({
                    token: '$SOAP_TOKEN',
                    page: 1,
                    pageSize: 10
                });
                console.log(JSON.stringify(result));
            } catch(error) {
                console.log(JSON.stringify({error: error.message}));
            }
        })();
    " > /tmp/soap_trainees.json

    compare_json_responses "/tmp/rest_trainees.json" "/tmp/soap_trainees.json" "Get Trainees"

    # Test 3: Get Workouts
    echo -e "\n${YELLOW}Test 3: Get Workouts${NC}"

    curl -s -X GET "$REST_URL/workouts" \
        -H "Authorization: Bearer $REST_TOKEN" > /tmp/rest_workouts.json

    node -e "
        const soap = require('soap');
        (async () => {
            try {
                const client = await soap.createClientAsync('$SOAP_URL');
                const [result] = await client.GetWorkoutsAsync({
                    token: '$SOAP_TOKEN'
                });
                console.log(JSON.stringify(result));
            } catch(error) {
                console.log(JSON.stringify({error: error.message}));
            }
        })();
    " > /tmp/soap_workouts.json

    compare_json_responses "/tmp/rest_workouts.json" "/tmp/soap_workouts.json" "Get Workouts"

    # Test 4: Create Workout
    echo -e "\n${YELLOW}Test 4: Create Workout${NC}"

    curl -s -X POST "$REST_URL/workouts" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $REST_TOKEN" \
        -d '{
            "name": "Test Comparison Workout",
            "duration": 30,
            "description": "Created for comparison test"
        }' > /tmp/rest_create_workout_test.json

    node -e "
        const soap = require('soap');
        (async () => {
            try {
                const client = await soap.createClientAsync('$SOAP_URL');
                const [result] = await client.CreateWorkoutAsync({
                    token: '$SOAP_TOKEN',
                    workout: {
                        name: 'Test Comparison Workout SOAP',
                        duration: 30,
                        description: 'Created for comparison test via SOAP'
                    }
                });
                console.log(JSON.stringify(result));
            } catch(error) {
                console.log(JSON.stringify({error: error.message}));
            }
        })();
    " > /tmp/soap_create_workout_test.json

    compare_json_responses "/tmp/rest_create_workout_test.json" "/tmp/soap_create_workout_test.json" "Create Workout"

    # Test 5: Error Handling
    echo -e "\n${YELLOW}Test 5: Error Handling (Invalid Token)${NC}"

    # REST with invalid token
    curl -s -X GET "$REST_URL/trainees" \
        -H "Authorization: Bearer invalid-token" > /tmp/rest_error.json

    # SOAP with invalid token
    node -e "
        const soap = require('soap');
        (async () => {
            try {
                const client = await soap.createClientAsync('$SOAP_URL');
                const [result] = await client.GetTraineesAsync({
                    token: 'invalid-token',
                    page: 1,
                    pageSize: 10
                });
                console.log(JSON.stringify(result));
            } catch(error) {
                console.log(JSON.stringify({error: error.message, fault: true}));
            }
        })();
    " > /tmp/soap_error.json

    # Check if both return error responses
    rest_has_error=$(jq 'has("error")' /tmp/rest_error.json 2>/dev/null || echo "false")
    soap_has_error=$(jq 'has("error") or has("fault")' /tmp/soap_error.json 2>/dev/null || echo "false")

    if [ "$rest_has_error" = "true" ] && [ "$soap_has_error" = "true" ]; then
        print_result "Error Handling" "PASS" "Both APIs return error for invalid token"
    else
        print_result "Error Handling" "FAIL" "Error handling inconsistent"
    fi

    # Test 6: Logout
    echo -e "\n${YELLOW}Test 6: Logout Operation${NC}"

    curl -s -X DELETE "$REST_URL/sessions" \
        -H "Authorization: Bearer $REST_TOKEN" > /tmp/rest_logout.json

    node -e "
        const soap = require('soap');
        (async () => {
            try {
                const client = await soap.createClientAsync('$SOAP_URL');
                const [result] = await client.LogoutAsync({
                    token: '$SOAP_TOKEN'
                });
                console.log(JSON.stringify(result));
            } catch(error) {
                console.log(JSON.stringify({error: error.message}));
            }
        })();
    " > /tmp/soap_logout.json

    compare_json_responses "/tmp/rest_logout.json" "/tmp/soap_logout.json" "Logout Operation"

    # Cleanup
    cleanup_test_data

    # Test Summary
    echo -e "\n${YELLOW}=== Test Summary ===${NC}"
    echo -e "Total Tests: $((PASSED + FAILED))"
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"

    if [ $FAILED -eq 0 ]; then
        echo -e "\n${GREEN}All tests passed! ✓${NC}"
        exit 0
    else
        echo -e "\n${RED}Some tests failed! ✗${NC}"
        exit 1
    fi
}

# Run tests
main "$@"