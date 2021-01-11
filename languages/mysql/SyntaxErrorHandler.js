
const antlr4 = require('antlr4')

// class for gathering errors and returning nice feedback
var SyntaxErrorHandler = function (annotations) {

    const el = new antlr4.error.ErrorListener(this)
    this.annotations = annotations
    return this

}

SyntaxErrorHandler.prototype = Object.create(antlr4.error.ErrorListener.prototype)
SyntaxErrorHandler.prototype.constructor = SyntaxErrorHandler

SyntaxErrorHandler.prototype.syntaxError = function (recognizer, offendingSymbol, line, column, msg, e) {

    // just a way to grab the relevant error details
    this.annotations.push({
        row: line - 1,
        column: column,
        text: msg,
        type: 'error'
    })

}

exports.SyntaxErrorHandler = SyntaxErrorHandler
