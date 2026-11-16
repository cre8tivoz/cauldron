# Cauldron

A free, open-source desktop app for designing and building real Astro websites with built-in design taste, where visual editing and an AI agent work side by side.

## Language

**Site / Project**:
The Astro website folder being designed and built in Cauldron. The home screen and File menu use **Project** when creating, opening, or managing folders on disk; the workspace, navigation rail, and inspector use **Site** for the website being edited.

**Starter template**:
One of the built-in Astro site starters used when creating a new project.

**Component library**:
Cauldron's collection of reusable plain-Astro sections and components that people add to a page.
_Avoid_: Blocks

**Design direction**:
A site's chosen look (references, type, colour and spacing), saved inside the site (`cauldron/DESIGN.md` and `cauldron/tokens.css`).
_Avoid_: Theme, design package

**Taste rules**:
The always-on rules for good design that every agent run follows, beneath a site's own design direction.
_Avoid_: Guardrails, mandates

**Agent run**:
One built-in agent job (Claude Code, Codex, or Hermes) and every change it made, which can be reviewed and undone as a whole.
