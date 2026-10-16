import URI from 'uri-js';

function getCleanUriPath(uri) {
  const parsed = URI.parse(uri);
  const path = parsed.path ?? "";
  let clean = path.replace(/\\/g, "/"); // backslashes -> forward slashes
  clean = clean.replace(/^\//, ""); // remove start slash
  clean = clean.replace(/\/$/, ""); // remove end slash
  return clean;
}

const testCases = [
  { name: "Windows-style path (no scheme)", input: "directory\\with.dot\\filename" },
  { name: "URI-style path (file scheme)", input: "file:///directory/with.dot/filename" },
  { name: "Simple path", input: "simple/path" },
  { name: "Path with backslashes", input: "a\\b\\c" }
];

console.log("--- URI-JS and getCleanUriPath Logic Verification ---\n");

for (const tc of testCases) {
  const parsed = URI.parse(tc.input);
  const cleaned = getCleanUriPath(tc.input);
  
  console.log(`Test: ${tc.name}`);
  console.log(`  Input:    ${tc.input}`);
  console.log(`  Parsed:   ${JSON.stringify(parsed)}`);
  console.log(`  Path:     ${JSON.stringify(parsed.path)}`);
  console.log(`  Cleaned:  ${JSON.stringify(cleaned)}`);
  console.log("---------------------------------------------------\n");
}
