const { prettyPrintError } = require('./errors')
const mysql = require('./mysql/')


function formatter(tree, options) {

    const lineBreakWords = options?.lineBreak || ['FROM', 'WINDOW', 'GROUP', 'HAVING', 'BEGIN', 'END' ]
    const indentTwoRules = options?.two || ['tableElements', 'limitClause', 'compoundStatement' ]
    const indentThreeRules = options?.three || ['tableElement', 'tableProperty', 'selectItem', 'queryExpression' ]
    const pad = i => (new Array(i >= 0 ? i : 0)).fill(options?.ws || '  ').join('')
    const ast = tree.parser
    const walk = {
        skipSpace: true,
        newLine: false,
        indent: 0,
        statements: 1,
        format: options?.format || true,
        visitChildren: (node) => {

            if (!node) return
            if (node.children) {

                return node.children.map(child => {

                    if (child.children && child.children.length !== 0) {

                        if (ast.ruleNames[child.ruleIndex] === 'sqlStatement' && walk.statements > 1) {
                            console.log('sqlStatement')

                            walk.newLine = true
                            walk.statements++
                            walk.indent = 0

                        }
                        if (ast.ruleNames[child.ruleIndex] === 'query') {
                            console.log('query')

                            walk.newLine = true
                            walk.indent = 1

                        }
                        if (indentTwoRules.includes(ast.ruleNames[child.ruleIndex])) {
                            console.log('2 indent')

                            walk.newLine = true
                            walk.indent = 2

                        }
                        if (indentThreeRules.includes(ast.ruleNames[child.ruleIndex])) {
                            console.log('3 indent')

                            walk.newLine = true
                            walk.indent = 3

                        }
                        return child.accept(walk)

                    } else {
                        
                        const t = child.getText()
                        if (t === '<EOF>') return
                        let space = ''
                        if (t == '_') debugger
                        if (walk.format) {

                            space = walk.skipSpace ? '' : ' '
                            if (lineBreakWords.includes(t)) {

                                if (t === 'FROM') {

                                    space = '\n' + pad(walk.indent - 1)

                                } else {

                                    space = '\n' + pad(2)
                                    walk.indent = 2

                                }

                            } else if (walk.newLine) {

                                walk.newLine = false
                                space = '\n' + pad(walk.indent)

                            }
                            if (t === 'JOIN') {

                                walk.newLine = true
                                walk.indent++

                            }
                            if (/^[.(=]$/.test(t)) {

                                walk.skipSpace = true

                            } else {

                                walk.skipSpace = false

                            }

                        }
                        if (/^[.,();=]$/.test(t)) {

                            return t

                        }
                        return space + t

                    }

                })

            }

        }}
    var out = tree.accept(walk)
    return out.flat(Infinity).join('')

}

exports.parse = mysql.parse
exports.error = prettyPrintError
exports.formatter = formatter
