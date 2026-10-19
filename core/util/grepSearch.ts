/*
  Formats the output of a grep search to reduce unnecessary indentation, lines, etc
  Assumes a command with these params
    ripgrep -i --line-number --ignore-file .continueignore --ignore-file .gitignore -C 1 --heading -m 100 -e <query> .
  
  Also can truncate the output to a specified number of characters
*/
export function formatGrepSearchResults(
  results: string,
  maxChars?: number,
): {
  formatted: string;
  numResults: number;
  truncated: boolean;
} {
  let numResults = 0;
  const keepLines: string[] = [];

  function countLeadingSpaces(line: string) {
    return line?.match(/^ */)?.[0].length ?? 0;
  }

  const processResult = (lines: string[]) => {
    // Skip results in which only the file path was kept
    const resultPath = lines[0];
    const resultContent = lines.slice(1);
    if (resultContent.length === 0) {
      return;
    }

    // Add path
    keepLines.push(resultPath);

    for (const line of resultContent) {
      const match = line.match(/^(\d+):/);
      if (match) {
        keepLines.push(match[1]);
      }
    }
  };

  let resultLines: string[] = [];
  for (const line of results.split("\n").filter((l) => !!l)) {
    if (line.startsWith("./") || line.startsWith(".\\") || line === "--") {
      processResult(resultLines); // process previous result
      resultLines = [line];
      numResults++;
      continue;
    }

    // Exclude leading zero- or single-char lines
    if (resultLines.length === 1 && line.trim().length <= 1) {
      continue;
    }

    resultLines.push(line);
  }
  processResult(resultLines);

  const formatted = keepLines.join("\n");
  if (maxChars && formatted.length > maxChars) {
    return {
      formatted: formatted.substring(0, maxChars),
      numResults,
      truncated: true,
    };
  } else {
    return {
      formatted,
      numResults,
      truncated: false,
    };
  }
}
