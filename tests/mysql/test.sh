#!/bin/bash

docker-compose up -d

sleep 60

node ../../index.js -s database -c 'mysql://root:rootpassword@127.0.0.1:3306/database' -p 'mysql://root:rootpassword@127.0.0.1:3307/database' > output.html 
node ../../index.js -c 'mysql://root:rootpassword@127.0.0.1:3306/database' -p 'mysql://root:rootpassword@127.0.0.1:3307/database' > schemaless.html 

docker-compose down

diff output.html schemaless.html > /dev/null && rm output.html schemaless.html
