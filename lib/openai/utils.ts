export function minimizeTokens(inputString: string): string {
  let result = inputString.trim();

  // Remove redundant whitespace within tags (HTML/XML)
  result = result.replace(/>\s+</g, "><");

  // Remove redundant whitespace within parentheses
  result = result.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");

  // Replace consecutive spaces, tabs, and line breaks with a single space
  result = result.replace(/\s+/g, " ");

  // Collapse multiple consecutive line breaks into a single line break
  result = result.replace(/\n+/g, "\n");

  // Remove whitespace around operators
  result = result.replace(/\s*([+\-*/%=^])\s*/g, "$1");

  return result;
}
