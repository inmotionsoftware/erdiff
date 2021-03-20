const sqlite3 = require('sqlite3')

const createConnection = async (connectionString) => {
  const file = connectionString.replace(/^sqlite:\/\//, '')
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY, (err) => {
      if (err) 
        reject(err)
      else {
        db.query = (sql) => new Promise((res, rej) => {
          db.all(sql,(err, row) => {
            if (err)
              rej(err)
            else
              res(row)
          })
        })
        resolve(db)
      }
    })
  })
}

const getTableQuery = () => {
  return `
SELECT
    "main" AS schema,
    sm.name AS "table",
    sm.type AS table_type,
    ti.name AS "column",
    ti.cid AS ordinal,
    ti.type AS "type",
    null AS length,
    (SELECT il."unique" FROM  pragma_index_list(sm.name) AS il JOIN pragma_index_info(il.name) AS ii WHERE ii.name = ti.name ) AS "unique",
    ti.pk AS pk,
    "main" AS ref_schema,
    (SELECT fk."table" FROM pragma_foreign_key_list(sm.name) AS fk WHERE fk.'from' = ti.name) AS ref_table,
    (SELECT fk."to" FROM pragma_foreign_key_list(sm.name) AS fk WHERE fk.'from' = ti.name) AS ref_column
  FROM sqlite_master AS sm
    inner join pragma_table_info(sm.name) AS ti
  WHERE sm.type IN ('table', 'view')
  ORDER BY sm.name, ti.cid
;`
}

exports.SqlLiteProcessor = {
  generateErd: async (connectionString, schemas) => {
    const connection = await createConnection(connectionString)

    const tablesQuery = getTableQuery()
    const tableData = await connection.query(tablesQuery)
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

    connection.close()
    return { tables, sprocs }
  }
}
