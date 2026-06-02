# Python + FastAPI Harness Template

**Stack:** Python 3.11+ / FastAPI / pytest / ruff / mypy

## Usage

```bash
/harness-init python-fastapi
```

## Sensors

- **lint**: ruff check
- **typecheck**: mypy
- **test**: pytest
- **coverage**: pytest with coverage (fail-under 80%)

## Customization

Adjust mypy strictness and coverage threshold in sensors.json after copying.
