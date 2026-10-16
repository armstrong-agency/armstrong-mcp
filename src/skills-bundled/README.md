# wf-audit/SKILL.md (Bundled Fallback)

This is a bundled fallback for the wf-audit skill. In production, this would contain the full skill content fetched from GitHub during build time.

The actual skill content should be fetched from:
https://raw.githubusercontent.com/armstrong-agency/skills/main/wf-audit/SKILL.md

## Build Process

During deployment, run:
```bash
npm run bundle-skills
```

This will fetch all skills from GitHub and bundle them into the Worker.
