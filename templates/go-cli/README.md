# Go CLI Harness Template

**Stack:** Go 1.21+ / golangci-lint / go test

## Usage

```bash
/harness-init go-cli
```

## Sensors

- **lint**: golangci-lint
- **test**: go test ./... -v
- **build**: go build ./...
- **coverage**: go test with coverprofile

## Customization

Adjust golangci-lint config and coverage thresholds in sensors.json after copying.
