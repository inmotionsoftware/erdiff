const mysql = require('mysql2/promise')

const createConnection = async (connectionString) => {
  let connection
  try {
    connection = await mysql.createConnection(connectionString)
  } catch (err) {
    console.log('uh oh! error connecting to mysql url')
    throw err
  } 
  return connection
}

const getTableSchemas = (schema) => {
  return schema.map(s => `c.TABLE_SCHEMA = '${s}'`).join(' OR ')
}

const getRoutineSchemas = (schema) => {
  return schema.map(s => `ROUTINE_SCHEMA = '${s}'`).join(' OR ')
}

const getTableQuery = (tableSchemas) => {
  return `
    SELECT
        c.TABLE_SCHEMA as \`schema\`,
        c.TABLE_NAME as \`table\`,
        t.TABLE_TYPE as table_type,
        c.COLUMN_NAME as \`column\`,
        c.ORDINAL_POSITION as ordinal,
        c.DATA_TYPE as \`type\`,
        COALESCE(c.CHARACTER_MAXIMUM_LENGTH, c.NUMERIC_PRECISION,c.DATETIME_PRECISION) as length,
        c.CHARACTER_SET_NAME as \`charset\`,
        c.COLUMN_KEY as ckey,
        pk.CONSTRAINT_NAME = 'PRIMARY' as pk,
        n.REFERENCED_TABLE_SCHEMA as ref_schema,
        n.REFERENCED_TABLE_NAME as ref_table,
        n.REFERENCED_COLUMN_NAME as ref_column
      FROM information_schema.\`COLUMNS\` AS c
        LEFT JOIN information_schema.\`TABLES\` AS t ON (c.TABLE_SCHEMA=t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME)
        LEFT JOIN information_schema.KEY_COLUMN_USAGE AS n ON (c.TABLE_SCHEMA=n.TABLE_SCHEMA AND c.TABLE_NAME = n.TABLE_NAME AND c.COLUMN_NAME = n.COLUMN_NAME AND n.REFERENCED_TABLE_SCHEMA IS NOT NULL)
        LEFT JOIN information_schema.KEY_COLUMN_USAGE AS pk ON (c.TABLE_SCHEMA=pk.TABLE_SCHEMA AND c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME AND pk.CONSTRAINT_NAME = 'PRIMARY')
      WHERE
        (${tableSchemas})
      ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION
    ;`
}

const getRoutineQuery = (sprocSchemas) => {
  return `
    SELECT
        ROUTINE_SCHEMA AS \`schema\`,
        ROUTINE_NAME AS name,
        ROUTINE_TYPE AS type,
        ROUTINE_DEFINITION AS body,
        SECURITY_TYPE AS security,
        DEFINER AS def,
        SQL_DATA_ACCESS AS access,
        ROUTINE_COMMENT AS comment,
        (SELECT GROUP_CONCAT('', CONCAT_WS(' ',PARAMETER_MODE,PARAMETER_NAME,DATA_TYPE) SEPARATOR ', ') FROM information_schema.PARAMETERS AS p WHERE (r.\`ROUTINE_SCHEMA\`=p.SPECIFIC_SCHEMA AND r.\`ROUTINE_NAME\` = p.\`SPECIFIC_NAME\`) ORDER BY p.ORDINAL_POSITION ASC) AS params
      FROM 
        information_schema.ROUTINES AS r
      WHERE
        ROUTINE_BODY='SQL' AND
        (${sprocSchemas})
    ;`
}

exports.MySqlProcessor = {
  generateErd: async (connectionString, schema) => {
    const connection = await createConnection(connectionString)

    if (schema.length) {
      tableSchemas = getTableSchemas(schema)
      sprocSchemas = getRoutineSchemas(schema)
    }

    const tablesQuery = getTableQuery(tableSchemas)
    const sprocQuery = getRoutineQuery(sprocSchemas)
    const [tableData] = await connection.query(tablesQuery)
    const [sprocData] = await connection.query(sprocQuery)
    const tables = {}
    const sprocs = {}

    tableData.forEach(row => {
      const name = `${row.schema}.${row.table}`
      if (!tables.hasOwnProperty(name)) {
        tables[name] = {
          columns: [],
          schema: row.schema,
          name: row.table,
          type: row.table_type,
          view_tables: row.view_tables
        }
      }
      const col = {
        name: row.column,
        type: row.type,
        length: row.length,
        position: row.ordinal,
        key: row.ckey,
        pk: !!row.pk
      }
      if (row.ref_table) {
        col.ref = {
          schema: row.ref_schema,
          table: row.ref_table,
          column: row.ref_column
        }
      }
      tables[name].columns.push(col)
    })

    sprocData.forEach(row => {
      const name = `${row.schema}.${row.name}`
      if (!sprocs.hasOwnProperty(name)) {
        sprocs[name] = row
        sprocs[name].body = `CREATE ${row.security == 'DEFINER' ? row.security : ''} ${row.security == 'DEFINER' ? `= '${row.def}'` : ''} ${row.type} ${row.name} (${row.params}) ${row.comment && `COMMENT '${row.comment}'`} ${row.access}
          ${row.body}`
      }
    })

    connection.close()
    return { tables, sprocs }
  }
};
