// chunk_and_embed_gemini.js
require('dotenv').config();
const fs = require('fs');
const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

// Chunk code
extractChunks(tree.rootNode);

// Embed with Gemini
async function embedWithGemini(text) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  const prompt = `
You are a machine learning model helping to semantically embed code chunks.
Return only a float array representing the semantic embedding of the following code:

${text}

Respond with nothing but the array.`;

  const result = await model.generateContent(prompt);
  const response = await result.response.text();

  // Parse response: expect something like "[0.123, 0.456, ...]"
  try {
    const vector = JSON.parse(response);
    if (Array.isArray(vector)) return vector;
    throw new Error('Invalid format');
  } catch {
    console.warn('⚠️ Failed to parse embedding from Gemini, response was:\n', response);
    return null;
  }
}

// Main driver
async function run() {
  const results = [];

  for (const chunk of chunks) {
    const snippet = chunk.text.slice(0, 1000); // token-safe
    const embedding = await embedWithGemini(snippet);
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

  fs.writeFileSync('output_gemini.json', JSON.stringify(results, null, 2));
  console.log('✅ All chunks embedded with Gemini and saved to output_gemini.json');
}

run();
