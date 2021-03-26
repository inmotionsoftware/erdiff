#!/bin/bash

docker-compose up -d

sleep 30

node ../../index.js -s database -c 'mysql://root:rootpassword@127.0.0.1:3306/database' -p 'mysql://root:rootpassword@127.0.0.1:3307/database' > output.html 

docker-compose down
