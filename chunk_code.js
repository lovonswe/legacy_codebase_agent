// chunk_code.js
const fs = require('fs');
const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');

const parser = new Parser();
parser.setLanguage(JavaScript);

const code = fs.readFileSync('legacy/big_file.js', 'utf8');
const tree = parser.parse(code);

console.log(JSON.stringify(tree.language.nodeTypeInfo.map(({type}) => type)));

const chunks = [];

function extractChunks(node) {
  if (node.type === 'function_declaration' || node.type === 'class_declaration') {
    const start = node.startIndex;
    const end = node.endIndex;
    chunks.push({
      type: node.type,
      text: code.slice(start, end),
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1
    });
  }
  for (let i = 0; i < node.namedChildCount; i++) {
    extractChunks(node.namedChild(i));
  }
}

extractChunks(tree.rootNode);

fs.writeFileSync('chunks.json', JSON.stringify(chunks, null, 2));
console.log('✅ Chunks saved to chunks.json');
