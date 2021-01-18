const { SqlLiteProcessor } = require('./sqlite.js')
const { MySqlProcessor } = require('./mysql.js')
const { PostgresProcessor } = require('./postgres.js')
const { exception } = require('console')

const getSchemaProcessor = (connectionString) => {
  if(connectionString.startsWith('postgres://')) {
    return PostgresProcessor
  } else if(connectionString.startsWith('sqlite://')) {
    return SqlLiteProcessor
  } else if(connectionString.startsWith('mysql://')) {
    return MySqlProcessor
  } else {
    throw new exception('no db connection')
  }
}

exports.generateErd = (current, schema) => {
  const schemaProcessor = getSchemaProcessor(current)
  schemaProcessor.generateErd(current, schema)
}