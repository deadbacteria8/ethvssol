#!/bin/bash

SCRIPT_NAME=$(basename "$0")

for file in *; do

  if [[ "$file" != "$SCRIPT_NAME" && "$file" != "Vote.circom" && "$file" != "create.sh" ]]; then
    echo "Removing file: $file"
    rm -rf "$file"  # Remove the file
  fi
done

echo "Cleanup completed."
