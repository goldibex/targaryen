#!/usr/bin/env bash
#

FIXTURES_FILE="./test/spec/lib/parser/fixtures.json"
SECRET_FILE="./targaryen-secret.json"

function run_setup {
    npm install
}

function run_test {
    EXIT_STATUS=0

    run_live_test || EXIT_STATUS=$?
    npm run lint || EXIT_STATUS=$?
    npm run test || EXIT_STATUS=$?

    if [[ $EXIT_STATUS -eq 0 ]]; then
        echo "Tests successful!"
    else
        echo "One or more tests failed!"
        exit $EXIT_STATUS
    fi
}

function setup_secret {
    if [[ -e $SECRET_FILE ]]; then
        echo "using existing secret file at ${SECRET_FILE}"
        return;
    fi

    if [ -e ] && [ -z "$FIREBASE_SECRET" ]; then
        echo "FIREBASE_SECRET is not set!"
        exit 1
    fi

    if [ -z "$FIREBASE_PROJECT_ID" ]; then
        echo "FIREBASE_PROJECT_ID is not set!"
        exit 1
    fi

    SECRET='{
        "token": "'$FIREBASE_SECRET'",
        "projectId":"'$FIREBASE_PROJECT_ID'"
    }'

    echo $SECRET > $SECRET_FILE
}

function run_live_test {
    setup_secret

    ./bin/targaryen-specs -v -i -s $FIXTURES_FILE

    if [[ -n "$(git status --porcelain ${FIXTURES_FILE})" ]]; then
        echo "Test specs need to be updated!"
        exit 2
    fi
}

case "$1" in

    setup)
        echo "installing targaryen dependencies...";
        echo "Assume node 4 or 6 is installed!"
        run_setup
        ;;

    test)
        echo "testing Targaryen..."
        run_test
        ;;

    test:live)
        echo "testing Targaryen live..."
        run_live_test
        ;;

    *)
        echo "Continuous integration commands for targaryen"
        echo ""
        echo "Usage: $0 {setup|test|test:live}"
        exit 1

esac
