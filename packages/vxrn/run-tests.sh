#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Navigate to the utils directory where test-runner.js is located
cd "$SCRIPT_DIR/src/utils" || exit 1

# Execute the test runner using Node.js
node test-runner.js
