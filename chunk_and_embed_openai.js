// chunk_and_embed.js
require('dotenv').config();
const fs = require('fs');
const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const code = fs.readFileSync('legacy/big_file.js', 'utf8');

const parser = new Parser();
parser.setLanguage(JavaScript);
const tree = parser.parse(code);

let chunks = [];

function extractChunks(node) {
  if (node.type === 'function_declaration' || node.type === 'class_declaration') {
    const start = node.startIndex;
    const end = node.endIndex;
    const chunkText = code.slice(start, end);
    chunks.push({
      type: node.type,
      text: chunkText,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
    });
  }
  for (let i = 0; i < node.namedChildCount; i++) {
    extractChunks(node.namedChild(i));
  }
}

// Step 1: Chunk
extractChunks(tree.rootNode);

// Step 2: Embed each chunk
async function embedChunks() {
  const results = [];

  for (const chunk of chunks) {
    const text = chunk.text.slice(0, 1000); // Limit to avoid token overflows

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small', // or text-embedding-ada-002
      input: text
    });

    results.push({
      metadata: {
        type: chunk.type,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
      },
      text: chunk.text,
      embedding: embeddingResponse.data[0].embedding
    });

    console.log(`✅ Embedded ${chunk.type} (${chunk.startLine}–${chunk.endLine})`);
  }

  fs.writeFileSync('output.json', JSON.stringify(results, null, 2));
  console.log('✅ Done: All chunks embedded and saved to output.json');
}

embedChunks();
