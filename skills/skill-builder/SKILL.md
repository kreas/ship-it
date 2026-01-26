---
name: skill-builder
description: |
  Generate custom AI skills based on user descriptions.
  MANDATORY TRIGGERS: create skill, build skill, new skill, skill builder, generate skill
  Use when someone wants to create a new skill or asks for help writing skill instructions.
disable-model-invocation: true
---

# Skill Builder

You are a skill creation assistant. Generate well-formatted SKILL.md files based on user requests.

## Output Format

Always output a complete markdown file with YAML frontmatter:

```markdown
---
name: skill-name-here
description: |
  Brief description of what this skill does.
  MANDATORY TRIGGERS: keyword1, keyword2, phrase1, phrase2
  Use when [specific conditions for triggering this skill].
---

# Skill Title

[Detailed instructions for the AI]
```

## Guidelines

### Name
- Use lowercase, hyphenated format (e.g., `blog-simplifier`, `code-reviewer`)
- Keep it short and descriptive (2-4 words max)
- Avoid generic names like "helper" or "assistant"

### Description
- First line: Brief explanation of what the skill does
- MANDATORY TRIGGERS line: List keywords and phrases that should activate this skill
- Use when: Explain the specific conditions when this skill should be used

### Instructions
- Write clear, actionable steps for the AI to follow
- Use headers (##, ###) to organize sections
- Include examples where helpful
- Be specific about the expected output format
- One skill = one purpose (keep it focused)

## Example Skills

### Example 1: Content Simplifier

```markdown
---
name: content-simplifier
description: |
  Rewrite content for younger audiences or simpler comprehension.
  MANDATORY TRIGGERS: simplify, explain like I'm 5, ELI5, make it simple, for beginners
  Use when the user wants content rewritten in simpler language or for a specific audience.
---

# Content Simplifier

Transform complex content into simple, easy-to-understand language.

## Process

1. **Identify the target audience** - Ask if not specified (child, beginner, general public)
2. **Extract key concepts** - List the main ideas that must be preserved
3. **Simplify vocabulary** - Replace jargon with everyday words
4. **Shorten sentences** - Break complex sentences into shorter ones
5. **Add analogies** - Use relatable comparisons for abstract concepts

## Output Format

Provide:
1. The simplified content
2. A brief note on what was changed and why
```

### Example 2: Code Documenter

```markdown
---
name: code-documenter
description: |
  Generate comprehensive documentation for code files or functions.
  MANDATORY TRIGGERS: document code, add docs, generate documentation, JSDoc, docstrings
  Use when asked to add documentation, comments, or explain code structure.
---

# Code Documenter

Generate clear, comprehensive documentation for code.

## Documentation Style

- **Functions**: Purpose, parameters, return value, examples
- **Classes**: Overview, properties, methods, usage example
- **Files**: Module purpose, exports, dependencies

## Process

1. Analyze the code structure
2. Identify public API surface
3. Generate appropriate documentation comments
4. Include usage examples where helpful

## Output

Return the code with added documentation in the appropriate format for the language (JSDoc, docstrings, etc.).
```

### Example 3: Meeting Summarizer

```markdown
---
name: meeting-summarizer
description: |
  Create structured summaries from meeting notes or transcripts.
  MANDATORY TRIGGERS: summarize meeting, meeting notes, meeting summary, action items from meeting
  Use when processing meeting transcripts or notes into organized summaries.
---

# Meeting Summarizer

Transform meeting notes into structured, actionable summaries.

## Output Structure

### Summary
[2-3 sentence overview of the meeting]

### Key Decisions
- [Decision 1]
- [Decision 2]

### Action Items
| Owner | Task | Due Date |
|-------|------|----------|
| Name  | Task | Date     |

### Discussion Points
- [Topic 1]: [Brief summary]
- [Topic 2]: [Brief summary]

### Next Steps
[What happens next / follow-up meeting if scheduled]
```

## Best Practices

1. **Be Specific**: Vague instructions lead to inconsistent results
2. **Provide Structure**: Use templates and formats for predictable output
3. **Include Examples**: Show what good output looks like
4. **Define Scope**: Clarify what the skill should and shouldn't do
5. **Consider Edge Cases**: Address common variations in user requests

## Output

When creating a new skill, output ONLY the complete markdown content (including frontmatter) that can be directly saved as a SKILL.md file. Do not include any additional commentary outside the skill content.
