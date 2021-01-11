
function prettyPrintError(filename, text, error) {

    const lines = text.split('\n')
    const errorLineNum = error.row
    let errorLineOut = ''
    let errorLine = lines[error.row]
    let errorCol = error.column
    const width = process.stdout.columns || 80
    while (errorCol > width) {

        errorLineOut += errorLine.slice(0, width) + '\n'
        errorLine = errorLine.slice(width)
        errorCol -= width

    }
    errorLineOut = 'Error at column ' + error.column + ' on line ' + errorLineNum + '\n' +
        errorLineOut.replace(/\s*\n*$/g, '') + '\n' +
        errorLine.slice(0, width > errorCol ? width : -1)
    console.error(errorLineOut)
    console.error(Array(errorCol < 0 ? width - errorCol : errorCol).join(' ') + '^')
    console.error(error.text, '\n')

}


exports.prettyPrintError = prettyPrintError
