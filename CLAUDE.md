# Claude Code Context Rules

## Rules File Maintenance

- **ALWAYS** update `CLAUDE.md` if you discover a new rule while interacting with the user.

## Context File Maintenance

- **ALWAYS** update `context.md` after completing any refactoring task
- **ALWAYS** mark tasks as completed (✅) when finished
- **ALWAYS** update progress tracking section with current status
- **ALWAYS** add any new findings or issues discovered during refactoring

## Service Refactoring Project

### Development Rules

- Focus on separation of concerns and code reusability
- Do NOT implement error handling or logging improvements
- Use existing `src/config/` folder for configuration consolidation
- Maintain existing functionality while improving code structure
- Remove console.log statements from production code

### File Organization

- Utilities go in `src/utils/`
- Configurations go in `src/config/`
- Keep service files focused on single responsibilities

### Architecture Rules

- **Separation of Concerns**: Services should handle business logic only, UI concerns belong in UI layer
- **Single Responsibility**: Each service/utility should have one clear purpose
- **Shared Configuration**: Use `src/config/services.config.ts` for constants used across multiple services
- **Coordinate Transformations**: Use `src/utils/coordinate-utils.ts` for all coordinate transformation logic
- **Confidence Checking**: Use `src/utils/confidence-utils.ts` for keypoint confidence validation
- **Recording Logic**: Use dedicated `RecordingService` separate from file storage operations
- **UI State Management**: Countdown and UI-specific state should be managed in UI hooks, not services
