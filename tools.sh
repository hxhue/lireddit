#!/bin/bash
set -e

if [[ "$1" == "pgweb" ]]; then
    set -x
    ./pgweb_linux_amd64 --user=postgres --pass=123457 --db=lireddit2
elif [[ "$1" == "service" ]]; then
    set -x
    sudo service postgresql start
    sudo service redis-server start
else
    echo "Invalid argument(s)"
fi
