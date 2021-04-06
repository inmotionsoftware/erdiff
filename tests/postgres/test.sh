#!/bin/bash

docker-compose up -d

sleep 30

node ../../index.js -s public -c 'postgres://user:rootpassword@127.0.0.1:5432/database' -p 'postgres://user:rootpassword@127.0.0.1:5433/database' > output.html 
node ../../index.js -c 'postgres://user:rootpassword@127.0.0.1:5432/database' -p 'postgres://user:rootpassword@127.0.0.1:5433/database' > schemaless.html 

docker-compose down

diff output.html schemaless.html > /dev/null && rm output.html schemaless.html
