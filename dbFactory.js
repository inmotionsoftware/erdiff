const { SqlLiteProcessor } = require('./sqlite.js')
const { MySqlProcessor } = require('./mysql.js')
const { PostgresProcessor } = require('./postgres.js')

function getSchemaProcessor(dbType) {
  switch(dbType) {
    case 'postgres':
      return new PostgresProcessor()
    case 'sqlite':
      return new SqlLiteProcessor()
    case 'mysql':
    default:
      return new MySqlProcessor()
  }
}

exports.getSchemaProcessor = getSchemaProcessor