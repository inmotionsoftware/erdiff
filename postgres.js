function PostgresProcessor() {}

PostgresProcessor.prototype.createConnection = async (connectionSettings) => {
  throw new Exception ('postgres not implemented')
}

PostgresProcessor.prototype.closeConnection = async (connection) => {
  throw new Exception ('postgres not implemented')
}

PostgresProcessor.prototype.getTableSchemas = async (schema) => {
  throw new Exception ('postgres not implemented')
}

PostgresProcessor.prototype.getRoutineSchemas = async (schema) => {
  throw new Exception ('postgres not implemented')
}

PostgresProcessor.prototype.getTableQuery = async (tableSchemas) => {
  throw new Exception ('postgres not implemented')
}

PostgresProcessor.prototype.getRoutineQuery = async (sprocSchemas) => {
  throw new Exception ('postgres not implemented')
}

PostgresProcessor.prototype.generateErd = async (connection, tablesQuery, sprocQuery) => {
  throw new Exception ('postgres not implemented')
}

exports.PostgresProcessor = PostgresProcessor;