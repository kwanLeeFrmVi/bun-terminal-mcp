// Helper to categorize error types
export function categorizeError(exitCode: number, stderr: string): string {
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
export function createErrorMessage(command: string, exitCode: number, stderr: string, errorType: string): string {
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

// Helper to extract base command from command string
function extractBaseCommand(command: string): string {
  // Remove leading/trailing whitespace
  const trimmed = command.trim();

  // Extract first word (base command)
  const firstWord = trimmed.split(/\s+/)[0];

  // Handle pipes, redirects, etc - get the actual command
  const baseCmd = firstWord.split('|')[0].split('>')[0].split('<')[0].trim();

  return baseCmd;
}

// Validate command against allowlist and denylist
export function validateCommand(
  command: string,
  allowedCommands: string[] | null,
  deniedCommands: string[] | null
): { allowed: boolean; reason?: string } {
  const baseCommand = extractBaseCommand(command);

  // If allowlist exists, command must be in the list
  if (allowedCommands && allowedCommands.length > 0) {
    if (!allowedCommands.includes(baseCommand)) {
      return {
        allowed: false,
        reason: `Command '${baseCommand}' is not in the allowlist. Allowed commands: ${allowedCommands.join(", ")}`,
      };
    }
  }

  // If denylist exists, command must NOT be in the list
  if (deniedCommands && deniedCommands.length > 0) {
    if (deniedCommands.includes(baseCommand)) {
      return {
        allowed: false,
        reason: `Command '${baseCommand}' is in the denylist. Denied commands: ${deniedCommands.join(", ")}`,
      };
    }
  }

  return { allowed: true };
}
