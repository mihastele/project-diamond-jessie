# Obsidian CLI - Diamond Test Runner

A command-line interface for running Diamond API tests in CI/CD pipelines and DevOps workflows.

## Installation

### Global Installation
```bash
npm install -g diamond
obsidian --help
```

### Local Usage
```bash
npm run obsidian -- <workspace-file> [options]
# or
node ./cli/obsidian.js <workspace-file> [options]
```

## Usage

```bash
obsidian <workspace-file> [options]
```

### Options

| Option | Description |
|--------|-------------|
| `-c, --collection <name>` | Run specific collection by name (partial match) |
| `-e, --environment <name>` | Use specific environment variables |
| `-d, --delay <ms>` | Delay between requests (default: 0) |
| `--stop-on-error` | Stop execution on first error |
| `--json` | Output results as JSON (for CI integration) |
| `--verbose` | Show detailed request/response info |
| `-h, --help` | Show help message |

## Examples

### Run all collections in a workspace
```bash
obsidian ./my-workspace.json
```

### Run a specific collection
```bash
obsidian ./my-workspace.json -c "API Tests"
```

### Run with an environment
```bash
obsidian ./my-workspace.json -c "API Tests" -e "Production"
```

### Output JSON for CI/CD
```bash
obsidian ./my-workspace.json --json > results.json
```

### Verbose output for debugging
```bash
obsidian ./my-workspace.json --verbose
```

### Stop on first failure
```bash
obsidian ./my-workspace.json --stop-on-error
```

## Workspace File Format

The CLI expects a Diamond workspace JSON file with the following structure:

```json
{
  "workspaces": [{
    "id": "workspace-id",
    "name": "My Workspace",
    "collections": [{
      "id": "collection-id",
      "name": "API Tests",
      "items": [{
        "id": "request-id",
        "type": "request",
        "name": "Get Users",
        "request": {
          "method": "GET",
          "url": "https://api.example.com/users",
          "headers": [],
          "body": { "type": "none" }
        }
      }]
    }],
    "environments": [{
      "id": "env-id",
      "name": "Production",
      "variables": [{
        "key": "BASE_URL",
        "value": "https://api.example.com",
        "enabled": true
      }]
    }],
    "globalVariables": []
  }],
  "activeWorkspaceId": "workspace-id"
}
```

## Test Scripts

Requests can include test scripts that run after the response is received:

```javascript
dm.test("Status is 200", function() {
  dm.expect(dm.response.status).to.equal(200);
});

dm.test("Response has data", function() {
  const json = dm.response.json();
  dm.expect(json).to.have.property("data");
});
```

### Available Test Assertions

- `dm.expect(value).to.equal(expected)` - Strict equality
- `dm.expect(value).to.be.true` - Check for true
- `dm.expect(value).to.be.false` - Check for false
- `dm.expect(value).to.be.lessThan(n)` - Less than comparison
- `dm.expect(value).to.be.greaterThan(n)` - Greater than comparison
- `dm.expect(value).to.be.at.least(n)` - At least comparison
- `dm.expect(value).to.have.property(name)` - Property exists
- `dm.expect(value).to.include(str)` - String includes
- `dm.expect(value).to.be.an("array")` - Type check

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | All tests passed |
| 1 | One or more tests failed or error occurred |

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run API Tests
  run: npx obsidian ./workspace.json --json > results.json
  
- name: Upload Results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: results.json
```

### GitLab CI
```yaml
api-tests:
  script:
    - npx obsidian ./workspace.json --json > results.json
  artifacts:
    paths:
      - results.json
```

### Jenkins
```groovy
stage('API Tests') {
  steps {
    sh 'npx obsidian ./workspace.json --json > results.json'
  }
  post {
    always {
      archiveArtifacts artifacts: 'results.json'
    }
  }
}
```
