# bun-terminal-mcp

A Model Context Protocol (MCP) server that forwards AI agent commands to shell using Bun's secure `$` utility.

## Features

- **Secure Command Execution**: Uses Bun's shell `$` which automatically escapes interpolated strings
- **Cross-Platform**: Works on Windows, Linux, and macOS
- **Simple API**: Exposes a single `execute_command` tool
- **Structured Output**: Returns stdout, stderr, exit code, and success status

## Installation

```bash
bun install
```

## Usage

### Run with bunx (recommended)

After publishing to npm, you can run directly with:

```bash
bunx bun-terminal-mcp
```

**Note:** This package requires Bun runtime and is not compatible with Node.js/npx.

### Run locally

Start the MCP server:

```bash
bun run start
```

Or directly:

```bash
bun run index.ts
```

Or make it executable and run:

```bash
chmod +x index.ts
./index.ts
```

## MCP Tool

The server exposes one tool:

### `execute_command`

Execute a shell command using Bun's secure shell.

**Parameters:**
- `command` (string): The shell command to execute

**Returns:**
```json
{
  "exitCode": 0,
  "stdout": "command output",
  "stderr": "",
  "success": true
}
```

## Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

### Using bunx (after publishing)

```json
{
  "mcpServers": {
    "bun-terminal": {
      "command": "bunx",
      "args": ["bun-terminal-mcp"]
    }
  }
}
```

### Using local installation

```json
{
  "mcpServers": {
    "bun-terminal": {
      "command": "bun",
      "args": ["run", "/path/to/bun-terminal-mcp/index.ts"]
    }
  }
}
```

## Security

Bun Shell escapes all interpolated strings by default, preventing shell injection attacks. Variables are treated as single quoted strings.
