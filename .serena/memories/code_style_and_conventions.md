The codebase uses TypeScript with modern features. Key conventions include:

- **Imports**: ES module imports are used.
- **Async/Await**: The code uses async/await for handling promises.
- **Error Handling**: `try...catch` blocks are used for error handling.
- **Typing**: `zod` is used for schema validation, ensuring type safety for tool inputs. Type assertions are used when dealing with error objects.
- **Constants**: `const` is preferred for variable declarations.
- **Entry Point**: The main logic is encapsulated in an async `main` function.
- **Top-level await**: The main function is called at the top level.
- **Shebang**: `#!/usr/bin/env bun` is used to make the script executable with Bun.
