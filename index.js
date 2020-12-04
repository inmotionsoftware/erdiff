// vim: set expandtab ts=2 sw=2:

const fs = require('fs')
const path = require('path')
const process = require('process')
const deepEqual = require('deep-equal')
const diff = require('diff')
const { graphviz } = require('node-graphviz')
const mysql = require('mysql2/promise')
const {Command, flags} = require('@oclif/command')
const pug = require('pug')

const htmlTemplate = pug.compileFile('html.pug')

async function generateErd (connection, tablesQuery, sprocQuery) {
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
  return {tables, sprocs}
}

function colDiff(current, previous) {
  const ret = Object.assign({change: []}, current)
  if (current.type != previous.type || current.length != previous.length) {
    ret.change.push('type')
  }
  if (current.ordinal != previous.ordinal) {
    ret.change.push('ordinal')
  }
  if (current.ref && previous.ref == undefined) {
    ret.change.push('ref')
    ret.ref_change = 'added'
  } else if (current.ref == undefined && previous.ref) {
    ret.change.push('ref')
    ret.ref_change = 'removed'
  } else if (!deepEqual(current.ref,previous.ref)) {
    ret.change.push('ref')
    ret.ref_change = 'updated'
    ret.old_ref = previous.ref
  }
  if (ret.change.length == 0) {
    delete ret.change
  }
  return ret
}

function sprocDiff(current, previous) {
  const c_sprocs = Object.keys(current)
  const p_sprocs = Object.keys(previous)
  // removed
  const r_sprocs = p_sprocs.filter(sproc => !c_sprocs.includes(sproc))
  // added
  const a_sprocs = c_sprocs.filter(sproc => !p_sprocs.includes(sproc))
  // sprocs in both (same)
  const s_sprocs = c_sprocs.filter(sproc => p_sprocs.includes(sproc))
  // unchanged sprocs
  const u_sprocs = s_sprocs.filter(sproc => deepEqual(current[sproc],previous[sproc]))
  // modified sprocs
  const m_sprocs = s_sprocs.filter(sproc => !u_sprocs.includes(sproc))
  m_sprocs.forEach(sproc => {
    current[sproc].change = 'modified'
    current[sproc].diff = diff.diffLines(previous[sproc].body, current[sproc].body)
  })
  r_sprocs.forEach(sproc => current[sproc] = {change: 'removed', ...(previous[sproc])})
  a_sprocs.forEach(sproc => current[sproc].change = 'added')
  u_sprocs.forEach(sproc => current[sproc].change = 'unchanged')
  return current
}

function schemaDiff(current, previous) {
  const c_tables = Object.keys(current)
  const p_tables = Object.keys(previous)
  const c_contents = c_tables.reduce((p,c) => ({...p, ...Object.fromEntries([[c,JSON.stringify(current[c])]])}), {})
  const p_contents = p_tables.reduce((p,c) => ({...p, ...Object.fromEntries([[c,JSON.stringify(previous[c])]])}), {})
  // removed
  const r_tables = p_tables.filter(table => !c_tables.includes(table))
  // added
  const a_tables = c_tables.filter(table => !p_tables.includes(table))
  // tables in both (same)
  const s_tables = c_tables.filter(table => p_tables.includes(table))
  // unchanged tables
  const u_tables = s_tables.filter(table => deepEqual(current[table],previous[table]))
  // modified tables
  const m_tables = s_tables.filter(table => !u_tables.includes(table))
  m_tables.forEach(table => {
    const c = current[table].columns.map(c => c.name)
    const p = previous[table].columns.map(c => c.name)
    const pCol = name => previous[table].columns.filter(col => col.name == name)[0]
    const r = p.filter(col => !c.includes(col))
    const a = c.filter(col => !p.includes(col))
    current[table].columns = current[table].columns.map(col => a.includes(col.name) ? {...col, added: true} : col)
    const s = c.filter(col => !a.includes(col))
    current[table].columns = current[table].columns.map(col => s.includes(col.name) ? colDiff(col,pCol(col.name)) : col)
    current[table].columns = current[table].columns.concat(previous[table].columns.filter(col =>
      r.includes(col.name)).map(col => ({...col, removed: true})))
  })
  a_tables.forEach(table => current[table].added = true)
  r_tables.forEach(table => current[table] = {removed:true, ...(previous[table])})
  return current
}

function graph(schema) {
  const tables = Object.keys(schema).sort((a,b) => ((schema[a]?.added && -1 )|| ( schema[a]?.removed && -1 ) || 0 ))
  const tableData = table => ({s: table.schema, t: table.name, a: table.added, r: table.removed})
  const refs = tables.map(t => schema[t].columns.filter(c => c.ref !== undefined).map(c=>({...c, ...tableData(schema[t])}))).flat()
  const cols = tables.map(t => schema[t].columns.map(c => `${schema[t].schema}.${schema[t].name}.${c.name}`)).flat()
  const views = tables.filter(t => schema[t].type=='VIEW')
  const idxOf = (s,t,c) => cols.indexOf(`${s}.${t}.${c}`)
  const color = v => v.removed ? ' BGCOLOR="lightpink"' : v.added ? ' BGCOLOR="lightgreen"' : ''
  const lineStyle = ref =>
    ref.ref_change == 'added' || ref.added || ref.a ? 'style="bold"; color="green"' : ref.ref_change == 'removed' ||
      ref.removed || ref.r ? 'style="dashed"; color="red"' : ''
  const keys = col => col.pk?'PK':col.key=='UNI'?'U':'Z_Z nbsp; Z_Z nbsp;'
  const row = (s,t,col) => `      <TR PORT="P${idxOf(s,t,col.name)}"><TD PORT="T${idxOf(s,t,col.name)}">${keys(col)}</TD><TD${color(col)} CELLPADDING="5" ALIGN="LEFT" ><B>${col.name}</B>Z_Z nbsp;</TD><TD PORT="H${idxOf(s,t,col.name)}">${col.type}${col.length&&col.length<30000?`(${col.length})`:''}</TD></TR>`
  const label = (table) => `<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="3">
      <TR><TD${color(table)} COLSPAN="3"><FONT POINT-SIZE="20">${table.type=='VIEW'?'Z_Z #x1F52D;':'Z_Z #x1F4D8;'} ${table.schema} ${table.name}</FONT> Z_Z nbsp;</TD></TR>
${table.columns.map((col) => row(table.schema,table.name,col)).join('\n')}
    </TABLE>>`
  const node = (table) => `  ${table.schema}_${table.name} [
    label=${label(table)}];`
  const line = (col, id) => `  ${col.s}_${col.t}:H${idxOf(col.s,col.t,col.name)}:e -> ${col.ref.schema}_${col.ref.table}:T${idxOf(col.ref.schema,col.ref.table,col.ref.column)}:w [
    id = ${id}
    ${lineStyle(col)}
  ];`
  const viewLine = (table, id) => table?.view_tables?.split(',')?.map(v =>
  `  ${table.schema}_${table.name} -> ${v} [
    id = "table_${id}"
    style="dotted"
    penwidth="4"
  ];`)?.join('\n')
  const base = `digraph erd {
  graph [
    rankdir="LR"
    splines="curved"
    // pack=true
    // concentrate=true
    ratio="auto"
    layout=neato;
    // model="circuit";
    // mode="sgd";
    // overlap="vpsc"; //false, compress, ...
    overlap="scalexy"; //false, compress, ...
    // sep="+60";
  ];
  node [shape = plaintext];
  legend [
    shape = record;
    penwidth = "6";
    label=<<TABLE BGCOLOR="white" BORDER="0" CELLBORDER="1" CELLSPACING="0">
        <TR><TD COLSPAN="2"><FONT POINT-SIZE="20">Legend</FONT></TD></TR>
        <TR><TD>Z_Z #x1F52D;</TD><TD>VIEW</TD></TR>
        <TR><TD>Z_Z #x1F4D8;</TD><TD>TABLE</TD></TR>
        <TR><TD COLSPAN="2" BGCOLOR="lightgreen">Added column or table</TD></TR>
        <TR><TD COLSPAN="2" BGCOLOR="lightpink">Removed column or table</TD></TR>
        <TR><TD>PK</TD><TD>Primary key</TD></TR>
        <TR><TD>U</TD><TD>Unique</TD></TR>
      </TABLE>>;
    pos="3645.0,4097.21!"
  ];
${tables.map(t => node(schema[t])).join('\n')}
${refs.map(line).join('\n')}
${views.map((t, i) => viewLine(schema[t], i)).join('\n')}
  }
  `
  //{ rank=same ${same.map(n => `"${n}"`).join(' ')} }
  return base
}

class ERD extends Command {
  static description = `
generate Entity Relationship Diagram
`
  async run() {
    const {flags} = this.parse(ERD)
    let tableSchemas = ''
    let sprocSchemas = ''
    if (flags?.schema?.length) {
      tableSchemas = flags.schema.map(s => `c.TABLE_SCHEMA = '${s}'`).join(' OR ')
      sprocSchemas = flags.schema.map(s => `ROUTINE_SCHEMA = '${s}'`).join(' OR ')
    }
    const tablesQuery = `
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
    n.REFERENCED_COLUMN_NAME as ref_column,
    (SELECT GROUP_CONCAT(CONCAT_WS('_',t.TABLE_SCHEMA,t.TABLE_NAME)) FROM information_schema.VIEW_TABLE_USAGE AS t WHERE t.VIEW_SCHEMA = c.TABLE_SCHEMA AND t.VIEW_NAME = c.TABLE_NAME GROUP BY t.VIEW_SCHEMA, t.VIEW_NAME) AS view_tables
  FROM information_schema.\`COLUMNS\` AS c
    LEFT JOIN information_schema.\`TABLES\` AS t ON (c.TABLE_SCHEMA=t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME)
    LEFT JOIN information_schema.KEY_COLUMN_USAGE AS n ON (c.TABLE_SCHEMA=n.TABLE_SCHEMA AND c.TABLE_NAME = n.TABLE_NAME AND c.COLUMN_NAME = n.COLUMN_NAME AND n.REFERENCED_TABLE_SCHEMA IS NOT NULL)
    LEFT JOIN information_schema.KEY_COLUMN_USAGE AS pk ON (c.TABLE_SCHEMA=pk.TABLE_SCHEMA AND c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME AND pk.CONSTRAINT_NAME = 'PRIMARY')
  WHERE
    (${tableSchemas})
  ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION
;`
    const sprocQuery = `
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
    let connection
    let erd
    if (flags.current && flags.current.startsWith('mysql://')) {
      try {
        connection = await mysql.createConnection(flags.current)
      } catch (err) {
        this.error('uh oh! error connecting to mysql url', {exit: 2})
      }
      erd = await generateErd(connection, tablesQuery, sprocQuery)
      connection.close()
    } else {
      try {
        erd = require (path.resolve(flags.current))
      } catch ( err ) {
        this.error('uh oh! error loading previous schema', {exit: 3})
      }
    }
    let previous
    if (flags.previous && flags.previous.startsWith('mysql://')) {
      try {
        connection = await mysql.createConnection(flags.previous)
      } catch (err) {
        this.error('uh oh! error connecting to previous mysql url', {exit: 2})
      }
      previous = await generateErd(connection, tablesQuery, sprocQuery)
      connection.close()
    } else if (flags.previous) {
      try {
        previous = require (path.resolve(flags.previous))
      } catch ( err ) {
        this.error('uh oh! error loading previous schema', {exit: 3})
      }
    }
    if (flags.save) {
      fs.writeFileSync(flags.save, JSON.stringify(erd))
    }
    if (previous) {
      schemaDiff(erd.tables, previous.tables)
      sprocDiff(erd.sprocs, previous.sprocs)
    }
    const g = graph(erd.tables)
    if (flags.dot) {
      fs.writeFileSync(flags.dot, g)
    }

    let svg
    if (!flags.quiet) {
      svg = await graphviz.layout(g,'svg','neato','-n2')
      //console.log(svg)
      svg = svg.replace(/svg width="[^"]*" height="[^"]*"/, 'svg width="100%" height="100%"')
      svg = svg.replace('<?xml version="1.0" encoding="UTF-8" standalone="no"?>', '')
      svg = svg.replace(`<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"
 "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">`, '')
      svg = svg.replace(/<!--.*-->/, '')
      svg = svg.replace(/Z_Z /g, '&')
      //console.log(svg)
      const sList = flags.schema ? flags.schema.join(', ') :
        Object.keys(Object.keys(erd.tables).map(n => erd.tables[n]).reduce((p,c) =>({...p, ...Object.fromEntries([[c.schema, 1]])}),{})).join(', ')
      const html = htmlTemplate({
        tables: erd.tables,
        schemas: sList,
        sprocs: erd.sprocs,
        erd: JSON.stringify(erd),
        svg
      })
      console.log(html)
    }
    //console.log(erd["telematics.translationmaintenanceschedule"])
  }
}

ERD.flags = {
  help: flags.help(),
  current: flags.string({
    char: 'c',
    env: 'MYSQL_CURRENT',
    required: true,
    description: 'mysql connection url or json file to generate ERD from, when diffing this is the new schema'
  }),
  previous: flags.string({
    char: 'p',
    env: 'MYSQL_PREVIOUS',
    description: 'mysql connection url or json file to using when diffing, used as the previous schema'
  }),
  quiet: flags.boolean({
    char: 'q',
    env: 'QUIET',
    default: false,
    description: 'do not output svg to stdout'
  }),
  schema: flags.string({
    char: 's',
    env: 'MYSQL_SCHEMA',
    multiple: true,
    description: 'schema(s) to graph and optionally diff'
  }),
  save: flags.string({
    char: 'f',
    env: 'SAVE_SCHEMA',
    description: 'save schema data for diffing later'
  }),
  dot: flags.string({
    char: 'd',
    description: 'save graphviz dot file'
  })
}

ERD.run()
  .catch(require('@oclif/errors/handle'))
