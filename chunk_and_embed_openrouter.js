// chunk_and_embed_openrouter.js
require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');

const parser = new Parser();
parser.setLanguage(JavaScript);
const code = fs.readFileSync('legacy/big_file.js', 'utf8');
const tree = parser.parse(code);

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

async function embedWithOpenRouter(text) {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        // model: 'openai/text-embedding-3-small', // You can switch to mistral, cohere, etc.
        model: 'meta-llama/llama-3.3-8b-instruct:free', // You can switch to mistral, cohere, etc.
        input: text
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.data[0].embedding;
  } catch (err) {
    console.error('❌ Error embedding:', err.response?.data || err.message);
    return null;
  }
}

async function run() {
  const results = [];

  for (const chunk of chunks) {
    const snippet = chunk.text.slice(0, 1000); // Keep it safe under 8k tokens
    const embedding = await embedWithOpenRouter(snippet);
    if (!embedding) continue;

    results.push({
      metadata: {
        type: chunk.type,
        startLine: chunk.startLine,
        endLine: chunk.endLine
      },
      text: chunk.text,
      embedding
    });

    console.log(`✅ Embedded ${chunk.type} (${chunk.startLine}–${chunk.endLine})`);
  }

  fs.writeFileSync('output_openrouter.json', JSON.stringify(results, null, 2));
  console.log('✅ All chunks embedded and saved to output_openrouter.json');
}

run();
