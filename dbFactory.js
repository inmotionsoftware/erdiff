const { SqlLiteProcessor } = require('./sqlite.js')
const { MySqlProcessor } = require('./mysql.js')
const { PostgresProcessor } = require('./postgres.js')

const getSchemaProcessor = (connectionString) => {
  if(connectionString.startsWith('postgresql://') ||
      connectionString.startsWith('postgres://') ||
      connectionString.startsWith('psql://')) {
    return PostgresProcessor
  } else if(connectionString.startsWith('sqlite://')) {
    return SqlLiteProcessor
  } else if(connectionString.startsWith('mysql://')) {
    return MySqlProcessor
  } else {
    throw new Error('no db connection')
  }
}

exports.generateErd = (current, schema, setSchema) => {
  const schemaProcessor = getSchemaProcessor(current)
  return schemaProcessor.generateErd(current, schema, setSchema)
}
