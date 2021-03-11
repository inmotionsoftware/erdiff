#!/bin/bash

docker-compose up -d

sleep 30

../../index.js -s database -c 'mysql://root@rootpassword:localhost:3306/database' -p 'mysql://root@rootpassword:localhost:3307/database' > output.html

docker-compose down
