export function buildPreviewDocument(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; min-height: 100%; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #111827; }
  .funnel-screen { min-height: 100vh; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}
