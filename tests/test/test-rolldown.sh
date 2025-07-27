#!/bin/bash
# Test script for rolldown mode

echo "Testing rolldown mode..."

# Set environment variable to enable rolldown tests
export ROLLDOWN_MODE=true

# Run the rolldown tests
yarn test:with-rolldown

echo "Rolldown tests completed"