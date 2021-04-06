#!/bin/bash

echo $(cd sqlite/; ./test.sh) && \
echo $(cd postgres/; ./test.sh) && \
echo $(cd mysql/; ./test.sh) && \
echo success
