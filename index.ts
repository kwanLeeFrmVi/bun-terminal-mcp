#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { categorizeError, createErrorMessage } from "./utils.js";

// Check if --json flag is passed
const useJsonOutput = process.argv.includes("--json");

const server = new McpServer({
  name: "bun-terminal-mcp",
  version: "0.0.1",
});

server.registerTool(
  "execute_command",
  {
    title: "Shell Command",
    description: "Run shell commands with full bash-like features: pipes (|), redirects (>, <), globs (*), command substitution $(). Returns JSON with stdout, stderr, exitCode, success. Cross-platform (Windows/Linux/macOS).",
    inputSchema: {
      command: z.string().describe("Shell command string. Supports pipes, redirects, globs, variables, command substitution. Examples: 'ls -la', 'cat file.txt | grep pattern', 'echo $HOME'"),
      timeout: z.number().optional().describe("Optional timeout in milliseconds (default: 30000ms / 30s, max: 300000ms / 5min)"),
    },
  },
  async ({ command, timeout }) => {
    const startTime = Date.now();
    const cwd = process.cwd();
    const timeoutMs = Math.min(timeout || 30000, 300000);

    try {
      // Execute command with timeout by spawning subprocess
      const proc = Bun.spawn(["/bin/sh", "-c", command], {
        stdout: "pipe",
        stderr: "pipe",
      });

      let timedOut = false;

      // Create timeout that will kill the process
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        proc.kill(9); // SIGKILL
      }, timeoutMs);

      // Wait for process completion
      const [stdoutText, stderrText] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      await proc.exited;
      clearTimeout(timeoutHandle);

      // If timed out, throw an error
      if (timedOut) {
        throw new Error(`Command timed out after ${timeoutMs}ms`);
      }

      const stdout = stdoutText;
      const stderr = stderrText;
      const exitCode = proc.exitCode || 0;
      const duration = Date.now() - startTime;
      const success = exitCode === 0;

      // Return JSON format if --json flag is set
      if (useJsonOutput) {
        const response: any = {
          success,
          exitCode,
          stdout,
          stderr,
          command,
          cwd,
          duration,
        };

        if (!success) {
          const errorType = categorizeError(exitCode, stderr);
          response.errorType = errorType;
          response.errorMessage = createErrorMessage(command, exitCode, stderr, errorType);

          if (errorType === "COMMAND_NOT_FOUND") {
            response.hint = "Check if the command is installed and available in PATH. Try 'which <command>' to verify.";
          } else if (errorType === "PERMISSION_DENIED") {
            response.hint = "Try running with appropriate permissions or check file/directory permissions.";
          } else if (errorType === "FILE_NOT_FOUND") {
            response.hint = "Verify the file path is correct and the file exists. Use 'ls' to check.";
          }
        }

        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          isError: !success,
        };
      }

      // Build plain text response (default)
      let output = "";

      if (success) {
        output = stdout;
        if (stderr.trim()) {
          output += `\n[stderr]: ${stderr.trim()}`;
        }
      } else {
        const errorType = categorizeError(exitCode, stderr);
        const errorMessage = createErrorMessage(command, exitCode, stderr, errorType);

        output = `❌ ${errorType} (exit ${exitCode})\n${errorMessage}\n`;

        if (stderr.trim()) {
          output += `\n${stderr.trim()}\n`;
        }

        if (errorType === "COMMAND_NOT_FOUND") {
          output += `\n💡 Check if the command is installed and available in PATH.`;
        } else if (errorType === "PERMISSION_DENIED") {
          output += `\n💡 Try running with appropriate permissions.`;
        } else if (errorType === "FILE_NOT_FOUND") {
          output += `\n💡 Verify the file path exists.`;
        }
      }

      return {
        content: [{ type: "text", text: output || "(no output)" }],
        isError: !success,
      };
    } catch (error) {
      const err = error as Error;
      const duration = Date.now() - startTime;
      const isTimeout = err.message.includes("timeout") || err.message.includes("timed out");

      // Return JSON format if --json flag is set
      if (useJsonOutput) {
        const response = {
          success: false,
          exitCode: isTimeout ? 124 : -1,
          stdout: "",
          stderr: err.message,
          command,
          cwd,
          duration,
          errorType: isTimeout ? "TIMEOUT" : "EXECUTION_ERROR",
          errorMessage: isTimeout
            ? `Command exceeded time limit of ${timeoutMs}ms (${timeoutMs/1000}s).`
            : `Failed to execute command: ${err.message}`,
          hint: isTimeout
            ? "Command took too long to execute. Try increasing timeout or simplifying the command."
            : "This is a shell execution error. Check command syntax and shell compatibility.",
          rawError: err.toString(),
        };

        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          isError: true,
        };
      }

      // Build plain text error response (default)
      let output = "";

      if (isTimeout) {
        output = `❌ TIMEOUT (exit 124)\nCommand exceeded time limit of ${timeoutMs}ms (${timeoutMs/1000}s).\n\n💡 Try increasing timeout or simplifying the command.`;
      } else {
        output = `❌ EXECUTION_ERROR (exit -1)\nFailed to execute command: ${err.message}\n\n💡 Check command syntax and shell compatibility.`;
      }

      return {
        content: [{ type: "text", text: output }],
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
