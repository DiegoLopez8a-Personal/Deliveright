#!/bin/bash

ACTION="$1"

BUILD_CMD=${2:-"build"}

REPO="shopify-prod"
CLUSTER="shopify-prod-production-sample-node-cluster-app"
SERVICE="shopify-prod-production-partner-node-service"
SHOPIFY_API_KEY=${SHOPIFY_API_KEY_PROD:-"NA"}

. build_functions.sh

main $ACTION $BUILD_CMD
