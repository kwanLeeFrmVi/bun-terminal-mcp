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

**Successful Response:**
```json
{
  "success": true,
  "exitCode": 0,
  "stdout": "command output",
  "stderr": "",
  "command": "echo 'hello'",
  "cwd": "/current/working/directory",
  "duration": 45
}
```

**Error Response:**
```json
{
  "success": false,
  "exitCode": 127,
  "stdout": "",
  "stderr": "bun: command not found: badcommand",
  "command": "badcommand",
  "cwd": "/current/working/directory",
  "duration": 12,
  "errorType": "COMMAND_NOT_FOUND",
  "errorMessage": "Command not found. The command 'badcommand' does not exist or is not in PATH.",
  "hint": "Check if the command is installed and available in PATH. Try 'which <command>' to verify."
}
```

**Error Types:**
- `COMMAND_NOT_FOUND` - Command doesn't exist or not in PATH
- `PERMISSION_DENIED` - Insufficient permissions
- `FILE_NOT_FOUND` - File or directory not found
- `INTERRUPTED` - Command was interrupted (Ctrl+C)
- `KILLED` - Command was killed (out of memory, etc.)
- `TIMEOUT` - Command exceeded time limit
- `COMMAND_FAILED` - Generic command failure
- `EXECUTION_ERROR` - Shell syntax error or execution failure

## Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

### Using bunx (recommended)

**Option 1: Using absolute path (most reliable)**
```json
{
  "mcpServers": {
    "bun-terminal": {
      "command": "/Users/YOUR_USERNAME/.bun/bin/bun",
      "args": ["x", "bun-terminal-mcp"]
    }
  }
}
```

**Option 2: Using bunx with PATH**
```json
{
  "mcpServers": {
    "bun-terminal": {
      "command": "bunx",
      "args": ["-y", "bun-terminal-mcp"],
      "env": {
        "PATH": "/Users/YOUR_USERNAME/.bun/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

**Find your Bun path:** Run `which bun` in terminal to find your Bun installation path.

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

⚠️ **Important Security Notice**

This MCP server uses Bun's `{ raw: command }` feature to execute arbitrary shell commands. This is intentional to allow full shell functionality (pipes, redirects, command substitution, etc.), but it means:

- **Any command passed to the server will be executed as-is**
- The server does **not** sanitize or validate commands
- Security responsibility lies with the AI agent and user to ensure safe commands

**Use this server only in trusted environments.**

### What this means:

✅ **Good**: Full shell capabilities - pipes, redirects, globs, command substitution, etc. all work
⚠️ **Risk**: Malicious commands will be executed if passed to the server

While Bun Shell escapes interpolated strings by default, this server intentionally bypasses that protection to enable full shell command execution.
