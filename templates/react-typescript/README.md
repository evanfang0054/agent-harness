# React + TypeScript Harness Template

**Stack:** React 18+ / TypeScript 5+ / Vite / Vitest / ESLint

## Usage

```bash
# Via harness-init skill
/harness-init react-typescript

# Or manually
cp templates/react-typescript/sensors.json .agent-harness/sensors.json
```

## What's Included

- **sensors.json**: ESLint + tsc + vitest + vite build
- **skills-recommended.md**: Skill subset for React+TS projects
- **hooks-config.json**: Standard SessionStart hook

## Customization

After copying, adjust:
- ESLint config path in sensors.json
- Test framework (vitest vs jest) in sensors.json
- Coverage threshold if needed
