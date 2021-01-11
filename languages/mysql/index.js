const antlr4 = require('antlr4')
const { MySqlLexer } = require('./MySqlLexer')
const SqlParser = require('./MySqlParser')
const SyntaxErrorHandler = require('./SyntaxErrorHandler')

// run the parser with custom syntax error handling
function parse(input) {

    const chars = new antlr4.InputStream(input)
    const lexer = new MySqlLexer(chars)
    const tokens = new antlr4.CommonTokenStream(lexer)
    const parser = new SqlParser.MySqlParser(tokens)
    parser.annotations = []
    const SyntaxHandler = new SyntaxErrorHandler.SyntaxErrorHandler(parser.annotations)
    parser.removeErrorListeners()
    parser.addErrorListener(SyntaxHandler)
    parser.buildParseTrees = true
    return parser

}

exports.parse = parse 
