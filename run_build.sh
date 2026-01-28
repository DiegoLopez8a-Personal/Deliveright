#!/bin/bash

ACTION="$1"
BUILD_CMD=${2:-"build"}

main(){
    set -eu

    echo "starting to build. ACTION is: [$ACTION]"

    ./run_build_uat.sh $ACTION $BUILD_CMD

    ./run_build_prod.sh $ACTION $BUILD_CMD

    echo "Done"
}

main $ACTION $BUILD_CMD
