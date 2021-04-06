const { Client } = require('pg')

const createConnection = async (connectionString) => {
  const client = new Client({connectionString})
  try {
    await client.connect()
  } catch (err) {
    throw new Error ('uh oh! error connecting to postgres url')
  }
  return client
}

const getAllSchemas = () => {
  return `SELECT SCHEMA_NAME AS name FROM information_schema.SCHEMATA WHERE SCHEMA_NAME NOT IN ('pg_toast','information_schema','pg_catalog');`
}

const getTableSchemas = (schema) => {
  return schema ? schema.map(s => `c.table_schema = '${s}'`).join(' OR ') : `c.table_schema = 'public'`
}

const getRoutineSchemas = (schema) => {
  return schema ? schema.map(s => `routine_schema = '${s}'`).join(' OR ') : `routine_schema = 'public'`
}

const getTableQuery = (tableSchemas) => {
  return `
WITH fk AS (
  SELECT
      tc.table_schema,
      tc.table_name,
      kcu.column_name,
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM
      information_schema.table_constraints AS tc
      LEFT JOIN information_schema.key_column_usage AS kcu ON (tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema)
      LEFT JOIN information_schema.constraint_column_usage AS ccu ON (ccu.constraint_name = kcu.constraint_name AND ccu.table_schema = kcu.table_schema)
    WHERE constraint_type = 'FOREIGN KEY'
)
SELECT
    c.table_schema as "schema",
    c.table_name as "table",
    t.table_type as table_type,
    c.column_name as "column",
    c.ordinal_position as ordinal,
    c.data_type as "type",
    COALESCE(c.character_maximum_length, c.numeric_precision,c.datetime_precision) as length,
    c.character_set_name as "charset",
    (SELECT uk.constraint_name
        FROM information_schema.table_constraints AS uk
          JOIN information_schema.key_column_usage AS kcu
            ON (uk.table_schema=kcu.table_schema AND uk.constraint_name = kcu.constraint_name)
        WHERE (
          c.table_schema=uk.table_schema
          AND c.column_name = kcu.column_name
          AND c.table_name = uk.table_name
          AND uk.constraint_type = 'UNIQUE'
        ) LIMIT 1
    ) IS NOT NULL as "unique",
    pk.constraint_name IS NOT NULL as pk,
    fk.foreign_table_schema as ref_schema,
    fk.foreign_table_name as ref_table,
    fk.foreign_column_name as ref_column
  FROM information_schema.columns AS c
    LEFT JOIN information_schema.tables AS t ON (c.table_schema=t.table_schema AND c.table_name = t.table_name)
    LEFT JOIN information_schema.table_constraints AS pk ON (c.table_schema=pk.table_schema AND c.table_name = pk.table_name AND pk.constraint_type = 'PRIMARY KEY')
    LEFT JOIN fk ON (c.table_schema=fk.table_schema AND c.table_name = fk.table_name AND c.column_name = fk.column_name)
  WHERE
    (${tableSchemas})
  ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ordinal_position
;`
}

const getRoutineQuery = (sprocSchemas) => {
  return `
SELECT
    routine_schema as "schema",
    routine_name as name,
    routine_type as type,
    routine_definition as body,
    security_type as security,
    sql_data_access as access,
    (SELECT string_agg(CONCAT_WS(' ',parameter_mode,parameter_name,data_type), ', ') FROM information_schema.parameters AS p WHERE (r.routine_schema = p.specific_schema AND r.routine_name = p.specific_name) GROUP BY parameter_mode,parameter_name,data_type,ordinal_position ORDER BY p.ordinal_position ASC) AS params
  FROM
    information_schema.ROUTINES AS r
  WHERE
    (${sprocSchemas})
;`
}



exports.PostgresProcessor = {
  generateErd: async (connectionString, schemas, setSchema) => {
    const connection = await createConnection(connectionString)
    let tableSchemas
    let sprocSchemas
    let s
    if (schemas && schemas?.length > 0) {
      tableSchemas = getTableSchemas(schemas)
      sprocSchemas = getRoutineSchemas(schemas)
    } else {
      const schema = await connection.query(getAllSchemas())
      s = schema.rows.map(i => i.name)
      if (setSchema instanceof Function)
        setSchema(s)
      tableSchemas = getTableSchemas(s)
      sprocSchemas = getRoutineSchemas(s)
    }

    const tablesQuery = getTableQuery(tableSchemas)
    const sprocQuery = getRoutineQuery(sprocSchemas)
    const {rows: tableData} = await connection.query(tablesQuery)
    const {rows: sprocData} = await connection.query(sprocQuery)
    const tables = {}
    const sprocs = {}
    if (tableData.length == 0 && sprocData.length == 0) {
      throw new Error ('no data found for schemas: ' + schemas || s)
    }
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
        key: (row.unique ? 'UNI' : null),
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
        sprocs[name].body = `CREATE ${row.security == 'DEFINER' ? row.security : ''} ${row.type} ${row.name} (${row.params}) ${row.access}
          ${row.body}`
      }
    })

    connection.end()
    return { tables, sprocs }
  }
}
