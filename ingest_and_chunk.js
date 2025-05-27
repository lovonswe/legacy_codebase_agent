const fs = require("fs");
const path = require("path");
const Parser = require("tree-sitter");
const JavaScript = require("tree-sitter-javascript");
const { typescript, tsx } = require("tree-sitter-typescript");
const simpleGit = require("simple-git");
const unzipper = require("unzipper");

const parser = new Parser();

const languageByExt = {
  ".js": JavaScript,
  ".jsx": JavaScript,
  ".ts": typescript,
  ".tsx": tsx
};

// 🧠 Extract relevant chunks (functions/classes/methods)
function extractChunks(node, parent = null, depth = 0, chunks, code) {

  console.log("print node info");  
  console.log(node.type, node.startPosition.row + 1, node.endPosition.row + 1);
  const isRelevant =
    node.type === "function_declaration" ||
    node.type === "class_declaration" ||
    node.type === "method_definition";

  if (isRelevant) {
    const nameNode = node.childForFieldName("name") || node.namedChildren[0];
    const name = nameNode ? nameNode.text : "(anonymous)";
    console.log(
      `Extracting ${node.type} "${name}" at ${node.startPosition.row + 1}-${node.endPosition.row + 1}`
    );
    chunks.push({
      id: `${node.type}@${node.startPosition.row + 1}-${node.endPosition.row + 1}`,
      type: node.type,
      name,
      text: code.slice(node.startIndex, node.endIndex),
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      parentType: parent?.type ?? null,
      childrenTypes: node.namedChildren.map((c) => c.type),
      depth
    });
  }

  for (let i = 0; i < node.namedChildCount; i++) {
    extractChunks(node.namedChild(i), node, depth + 1, chunks, code);
  }
}

// 📁 Recursively collect files
function collectFiles(dir, result) {
    console.log(`Collecting files from: ${dir}`);
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      collectFiles(fullPath, result);
    } else {
      result.push(fullPath);
    }
  }
}

// 🚀 Main entry point
async function ingest({ repoUrl, zipPath, filePaths }) {
  const codeFiles = [];

  // Git repo
  if (repoUrl) {
    const repoName = repoUrl.split("/").pop().replace(".git", "");
    const cloneDir = `./repos/${repoName}`;
    await simpleGit().clone(repoUrl, cloneDir);
    collectFiles(cloneDir, codeFiles);
  }

  // Zip file
  if (zipPath) {
    const unzipDir = `./unzipped/${Date.now()}`;
    await fs
      .createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: unzipDir }))
      .promise();
    collectFiles(unzipDir, codeFiles);
  }

  // Direct files
  if (filePaths?.length > 0) {

    filePaths.forEach((f) => codeFiles.push(f));
  }

  const allChunks = [];

  for (const file of codeFiles) {
    console.log(`Processing file: ${file}`);
    const ext = path.extname(file);
    const lang = languageByExt[ext];
    if (!lang) continue;

    parser.setLanguage(lang);
    const code = fs.readFileSync(file, "utf8");
    const tree = parser.parse(code);
    const chunks = [];

    extractChunks(tree.rootNode, null, 0, chunks, code);

    for (const chunk of chunks) {
      chunk.filePath = path.relative(".", file);
      chunk.language = ext.replace(".", "");
    }

    allChunks.push(...chunks);
  }

  fs.writeFileSync("chunks.json", JSON.stringify(allChunks, null, 2));
  console.log(`✅ Done. ${allChunks.length} chunks saved to chunks.json`);
}

// 🧪 Run with any input type
// if (require.main === module) {
  ingest({
    repoUrl: "https://github.com/lovonswe/chaldal",
    // zipPath: "./code.zip",
    // filePaths: ["./legacy/big_file_react.js"]
  });
// }
