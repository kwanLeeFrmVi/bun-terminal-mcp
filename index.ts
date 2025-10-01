#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { $ } from "bun";
import { z } from "zod";

const server = new McpServer({
  name: "bun-terminal-mcp",
  version: "1.0.0",
});

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
    try {
      const result = await $`${{ raw: command }}`.quiet();

      const stdout = result.stdout.toString();
      const stderr = result.stderr.toString();
      const exitCode = result.exitCode;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              exitCode,
              stdout,
              stderr,
              success: exitCode === 0,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      const err = error as Error;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              exitCode: 1,
              stdout: "",
              stderr: err.message,
              success: false,
            }, null, 2),
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
