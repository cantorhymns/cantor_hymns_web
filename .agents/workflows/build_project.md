# Build Project Workflow

This workflow details the steps required to install dependencies, run static typechecks, and build the Cantor Coptic Hymn Learning web application.

## Steps

### 1. Environment Verification
Ensure Node.js is installed and compatible (version >= 20):
```bash
node --version
```

### 2. Configure npm Registry
Ensure that the public npm registry is used for installations, overriding any unreachable corporate/internal registries:
```bash
# Verify the current configuration
npm config get registry
```
If the registry is set to an unreachable internal server, verify that the local `.npmrc` file is present in the project root with the following line:
```text
registry=https://registry.npmjs.org/
```

### 3. Install Dependencies
Install all package dependencies defined in `package.json`:
```bash
npm install
```

### 4. Run TypeScript Typecheck
Verify code quality and compile-time type safety before building:
```bash
npm run typecheck
```

### 5. Build the Web Application
Compile the Next.js application for production:
```bash
npm run build
```
The build should complete successfully, creating an optimized bundle under `.next/`.
