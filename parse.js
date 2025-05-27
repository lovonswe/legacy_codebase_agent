// parse.js
const fs = require('fs');
const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');

// Load and parse the file
const code = fs.readFileSync('legacy/big_file.js', 'utf8');
const parser = new Parser();
parser.setLanguage(JavaScript);
const tree = parser.parse(code);

// Recursive function to walk the syntax tree
function extractFunctions(node) {
  if (node.type === 'function_declaration') {
    const name = node.childForFieldName('name');
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;
    console.log(`Function: ${name.text} (${startLine}–${endLine})`);
  }
  for (let i = 0; i < node.namedChildCount; i++) {
    extractFunctions(node.namedChild(i));
  }
}

// Start from the root node
extractFunctions(tree.rootNode);
