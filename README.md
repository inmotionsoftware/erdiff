# ERDiff

A Database diffing and diagramming tool.  Generate diffable snapshots of your schema, diffs between verstions viewable in a browser.  Use it to compare environtments before deploys or as part of your process(pull requests, CI, Deployments, etc).  There are a few ways to run the tool:

* snapshot - save schema from a database
* snapshot diff - diff two saved schemas
* sequential diff - save schema from a database, modifify the database and diff the current(new) schema against the saved schema.
* online diff - diff two active databases 

## INSTALL

Install globally on your system with npm or yarn 
- npm ```Shell
sudo npm install -g erdiff
```
- yarn ```Shell
sudo yarn add global erdiff
```

To use it in a project `npm install erdiff` or `yarn add erdiff`

## USAGE

Example diffing two postgres databases `staging-host` and `prod-host` 
```Shell
$ erdiff -s public -c 'postgres://user@pass:staging-host:5432/database' -p 'postgres://user@pass:prod-host:5432/database' > output.html
```

Example of diffing the same database at different times, this could be done as part of a CI process

```Shell
# migrate database to revision A
$ export DB_CURRENT=mysql://user@pass:localhost/database
$ export DB_SCHEMA=first,second,third
$ erdiff -q -f main-branch.schema
# migrate databse to revision B
$ erdiff -p main-branch.schema > output.html
```

## OPTIONS
  -c, --current=current    (required) mysql connection url or json file to
                           generate ERD from, when diffing this is the new
                           schema

  -d, --dot=dot            save graphviz dot file

  -f, --save=save          save schema data for diffing later

  -p, --previous=previous  mysql connection url or json file to using when
                           diffing, used as the previous schema

  -q, --quiet              do not output svg to stdout

  -s, --schema=schema      schema(s) to graph and optionally diff

  --help                   show CLI help

## ENVIRONMENT VARIABLES

  * `DB_CURRENT`               environment version of -c option
  * `DB_PREVIOUS`              environment version of -p option
  * `QUIET`                    environment version of -q option
  * `DB_SCHEMA`                environment version of -s option,
  * `SAVE_SCHEMA`              environment version of -f option

## DESCRIPTION
  generate Entity Relationship Diagram with differences

