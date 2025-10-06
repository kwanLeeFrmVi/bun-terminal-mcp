#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { $ } from "bun";
import { z } from "zod";

const server = new McpServer({
  name: "bun-terminal-mcp",
  version: "1.0.7",
});

// Helper to categorize error types
function categorizeError(exitCode: number, stderr: string): string {
  if (exitCode === 127) return "COMMAND_NOT_FOUND";
  if (exitCode === 126) return "PERMISSION_DENIED";
  if (exitCode === 130) return "INTERRUPTED";
  if (exitCode === 137) return "KILLED";
  if (exitCode === 124) return "TIMEOUT";
  if (stderr.includes("permission denied")) return "PERMISSION_DENIED";
  if (stderr.includes("command not found") || stderr.includes("not found")) return "COMMAND_NOT_FOUND";
  if (stderr.includes("No such file or directory")) return "FILE_NOT_FOUND";
  if (exitCode > 0) return "COMMAND_FAILED";
  return "UNKNOWN_ERROR";
}

// Helper to create human-readable error message
function createErrorMessage(command: string, exitCode: number, stderr: string, errorType: string): string {
  const messages: Record<string, string> = {
    COMMAND_NOT_FOUND: `Command not found. The command '${command.split(' ')[0]}' does not exist or is not in PATH.`,
    PERMISSION_DENIED: `Permission denied. You don't have permission to execute this command or access the resource.`,
    FILE_NOT_FOUND: `File or directory not found. Check that the path exists and is spelled correctly.`,
    INTERRUPTED: `Command was interrupted (SIGINT/Ctrl+C).`,
    KILLED: `Command was killed (SIGKILL). Possibly out of memory or exceeded resource limits.`,
    TIMEOUT: `Command exceeded time limit.`,
    COMMAND_FAILED: `Command exited with non-zero status code ${exitCode}.`,
  };

  return messages[errorType] || `Command failed with exit code ${exitCode}.`;
}

server.registerTool(
  "execute_command",
  {
    title: "Shell Command",
    description: "Run shell commands with full bash-like features: pipes (|), redirects (>, <), globs (*), command substitution $(). Returns JSON with stdout, stderr, exitCode, success. Cross-platform (Windows/Linux/macOS).",
    inputSchema: {
      command: z.string().describe("Shell command string. Supports pipes, redirects, globs, variables, command substitution. Examples: 'ls -la', 'cat file.txt | grep pattern', 'echo $HOME'"),
    },
  },
  async ({ command }) => {
    const startTime = Date.now();
    const cwd = process.cwd();

    try {
      const result = await $`${{ raw: command }}`.nothrow().quiet();

      const stdout = result.stdout.toString();
      const stderr = result.stderr.toString();
      const exitCode = result.exitCode;
      const duration = Date.now() - startTime;
      const success = exitCode === 0;

      // Build detailed response
      const response: any = {
        success,
        exitCode,
        stdout,
        stderr,
        command,
        cwd,
        duration,
      };

      // Add error details if command failed
      if (!success) {
        const errorType = categorizeError(exitCode, stderr);
        response.errorType = errorType;
        response.errorMessage = createErrorMessage(command, exitCode, stderr, errorType);

        // Add helpful hints
        if (errorType === "COMMAND_NOT_FOUND") {
          response.hint = "Check if the command is installed and available in PATH. Try 'which <command>' to verify.";
        } else if (errorType === "PERMISSION_DENIED") {
          response.hint = "Try running with appropriate permissions or check file/directory permissions.";
        } else if (errorType === "FILE_NOT_FOUND") {
          response.hint = "Verify the file path is correct and the file exists. Use 'ls' to check.";
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2),
          },
        ],
        isError: !success,
      };
    } catch (error) {
      const err = error as Error;
      const duration = Date.now() - startTime;

      // Handle execution errors (syntax errors, shell errors, etc.)
      const response = {
        success: false,
        exitCode: -1,
        stdout: "",
        stderr: err.message,
        command,
        cwd,
        duration,
        errorType: "EXECUTION_ERROR",
        errorMessage: `Failed to execute command: ${err.message}`,
        hint: "This is a shell execution error. Check command syntax and shell compatibility.",
        rawError: err.toString(),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2),
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Bun Terminal MCP server is running...");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
