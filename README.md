#ERDiff

A Database diffing and diagramming tool.  Generate diffable snapshots of your schema, diffs between verstions viewable in a browser.  Use it to compare environtments before deploys or as part of your process(pull requests, CI, Deployments, etc).  There are a few ways to run the tool:

* snapshot - save schema from a database
* snapshot diff - diff two saved schemas
* sequential diff - save schema from a database, modifify the database and diff the current(new) schema against the saved schema.
* online diff - diff two active databases 





##USAGE
  $ erdiff

##OPTIONS
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

##DESCRIPTION
  generate Entity Relationship Diagram with differences

