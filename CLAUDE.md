# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`ezmarkets` is a Node.js project (CommonJS) in early initialization. No source code, tests, or build tooling has been added yet.

## Commands

```bash
# Install dependencies (once packages are added)
npm install

# Run tests (once a test framework is configured)
npm test
```

## Notes

- `package.json` uses `"type": "commonjs"` — use `require()`/`module.exports` unless this is changed to `"module"`.
- No framework, test runner, or linter is configured yet. Update this file as the stack is established.
