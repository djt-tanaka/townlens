#!/bin/bash

# This script deletes all merged branches that are not the main branch

# Specify the main branch name
MAIN_BRANCH="main"

# Fetch all branches
branches=$(git branch --merged | grep -v "$MAIN_BRANCH")

# Loop through merged branches and delete
for branch in $branches; do
    echo "Deleting branch: $branch"
    git branch -d "$branch"
done

# Optionally, delete remote branches
# Uncomment the following lines if desired
# for branch in $branches; do
#     echo "Deleting remote branch: $branch"
#     git push origin --delete "$branch"
# done
