function SqliteProcessor() {}

SqliteProcessor.prototype.createConnection = async (connectionSettings) => {
  throw new Exception ('sqlite not implemented')
}

SqliteProcessor.prototype.closeConnection = async (connection) => {
  throw new Exception ('sqlite not implemented')
}

SqliteProcessor.prototype.getTableSchemas = async (schema) => {
  throw new Exception ('sqlite not implemented')
}

SqliteProcessor.prototype.getRoutineSchemas = async (schema) => {
  throw new Exception ('sqlite not implemented')
}

SqliteProcessor.prototype.getTableQuery = async (tableSchemas) => {
  throw new Exception ('sqlite not implemented')
}

SqliteProcessor.prototype.getRoutineQuery = async (sprocSchemas) => {
  throw new Exception ('sqlite not implemented')
}

SqliteProcessor.prototype.generateErd = async (connection, tablesQuery, sprocQuery) => {
  throw new Exception ('sqlite not implemented')
}

exports.SqliteProcessor = SqliteProcessor;