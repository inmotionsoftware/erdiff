#!/bin/bash

rm current.db previous.db

docker-compose up

node ../../index.js -c sqlite://./current.db -p sqlite://./previous.db > test.html

diff -sqb reference.html test.html

ex_code=$?

if [[ $ex_code == 0 ]]; then
  rm current.db previous.db test.html
fi

exit $ex_code
