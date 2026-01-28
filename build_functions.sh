#!/bin/bash

build(){
    C_HASH="$1"
    NEW_TAG="$2"

    echo "Docker shopify image for ECR repo: [${REPO}]"

    docker build --tag 051949123541.dkr.ecr.us-east-1.amazonaws.com/${REPO}:$NEW_TAG \
     --build-arg SHOPIFY_API_KEY=${SHOPIFY_API_KEY} \
      . \
      --label "gh.git-commit=${C_HASH:-'NA'}" \
      --label "gh.version=${NEW_TAG}" 
}

upload_ecr_image(){
    REPO_NAME="$REPO"
    NEW_TAG="$2"

    aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 051949123541.dkr.ecr.us-east-1.amazonaws.com/$REPO_NAME
    docker push 051949123541.dkr.ecr.us-east-1.amazonaws.com/$REPO_NAME:$NEW_TAG
}

set -e
set -x

echo "run_build started. ACTION is: [$ACTION]"

GIT_SHORT_COMMIT_HASH=$(echo $GIT_COMMIT | cut -c 1-6)

APP_VERSION=$(cat package.json | jq -r '.version')

NEW_TAG=$(echo "$APP_VERSION-$BUILD_NUMBER-$GIT_SHORT_COMMIT_HASH")

echo "New Tag is: $NEW_TAG"

[[ "$ACTION" == "build" ]] && build $GIT_COMMIT $NEW_TAG

[[ "$ACTION" == "upload" ]] && upload_ecr_image $REPO $NEW_TAG

echo "Done"
