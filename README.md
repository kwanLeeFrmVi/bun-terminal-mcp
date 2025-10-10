# bun-terminal-mcp

A Model Context Protocol (MCP) server that forwards AI agent commands to shell using Bun's secure `$` utility.

## Features

- **Command Filtering**: Allowlist/denylist support for safe command execution
- **Plain Text Output**: Token-efficient output by default (saves 60-70% tokens)
- **Optional JSON Mode**: Use `--json` flag for structured output
- **Timeout Support**: Configurable timeout (default: 30s, max: 5min)
- **Secure Command Execution**: Uses Bun's shell for command execution
- **Cross-Platform**: Works on Windows, Linux, and macOS
- **Simple API**: Exposes a single `execute_command` tool

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
- `timeout` (number, optional): Timeout in milliseconds (default: 30000ms / 30s, max: 300000ms / 5min)

## Output Formats

### Plain Text Output (Default)

Token-efficient output format that saves 60-70% tokens compared to JSON.

**Successful Response:**
```
command output here
```

**Error Response:**
```
❌ COMMAND_NOT_FOUND (exit 127)
Command not found. The command 'badcommand' does not exist or is not in PATH.

bun: command not found: badcommand

💡 Check if the command is installed and available in PATH.
```

### JSON Output (with `--json` flag)

Use the `--json` flag when starting the server for structured JSON output.

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
- `TIMEOUT` - Command exceeded time limit (killed after timeout)
- `COMMAND_FAILED` - Generic command failure
- `EXECUTION_ERROR` - Shell syntax error or execution failure

**Timeout Example:**
```json
{
  "command": "sleep 10",
  "timeout": 2000
}
```
This will kill the command after 2 seconds and return a TIMEOUT error.

## Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

### Basic Setup

#### Plain Text Mode (Recommended)

Token-efficient plain text output (default):

```json
{
  "mcpServers": {
    "bun-terminal": {
      "command": "bunx",
      "args": ["--bun", "bun-terminal-mcp@latest"]
    }
  }
}
```

### JSON Mode

For structured JSON output, add `--json` flag:

```json
{
  "mcpServers": {
    "bun-terminal-json": {
      "command": "bunx",
      "args": ["--bun", "bun-terminal-mcp@latest", "--json"]
    }
  }
}
```

### Local Installation

**Plain Text Mode:**
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

**JSON Mode:**
```json
{
  "mcpServers": {
    "bun-terminal-json": {
      "command": "bun",
      "args": ["run", "/path/to/bun-terminal-mcp/index.ts", "--json"]
    }
  }
}
```

> **Tip**: Using `@latest` ensures you always get the newest version. You can also pin to a specific version like `bun-terminal-mcp@1.0.10`.

**Find your Bun path:** Run `which bunx` in terminal to find your Bun installation path (usually `~/.bun/bin/bunx`).

## Command Filtering

Restrict which commands can be executed using allowlist or denylist:

### Allowlist Mode (Whitelist)

Only allow specific commands to run:

```json
{
  "mcpServers": {
    "bun-terminal-safe": {
      "command": "bunx",
      "args": ["--bun", "bun-terminal-mcp@latest", "--allow", "ls,cd,pwd,cat,grep,echo"]
    }
  }
}
```

**Any command not in the allowlist will be blocked.**

### Denylist Mode (Blacklist)

Block specific dangerous commands:

```json
{
  "mcpServers": {
    "bun-terminal-restricted": {
      "command": "bunx",
      "args": ["--bun", "bun-terminal-mcp@latest", "--deny", "rm,rmdir,dd,mkfs,sudo,chmod"]
    }
  }
}
```

**All commands work except those in the denylist.**

### Combined with Other Flags

```json
{
  "mcpServers": {
    "bun-terminal-custom": {
      "command": "bunx",
      "args": [
        "--bun",
        "bun-terminal-mcp@latest",
        "--json",
        "--allow",
        "ls,pwd,cat,grep"
      ]
    }
  }
}
```

### Common Safe Allowlists

**Read-only operations:**
```
--allow ls,pwd,cat,grep,find,head,tail,wc,echo,whoami,date
```

**Basic navigation and file operations:**
```
--allow ls,cd,pwd,cat,grep,mkdir,touch,cp,mv,echo
```

**Git operations:**
```
--allow git,ls,cat,grep,diff
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
