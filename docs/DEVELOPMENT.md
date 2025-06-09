# Development Guide

## Quick Start

```bash
# Setup
git clone <repo>
cd kb-sport-app
pnpm install
pnpm dev

# Development
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm typecheck    # TypeScript validation
pnpm lint         # ESLint
```

## Project Structure

```
src/
├── features/
│   ├── workout/           # Real-time workout execution
│   │   ├── components/    # UI components
│   │   └── hooks/         # Feature hooks
│   └── sessions/          # Workout history
├── shared/
│   ├── store/            # Zustand stores
│   ├── types/            # TypeScript definitions
│   └── components/       # Reusable UI
├── service/              # Business logic services
└── app.tsx              # Root component
```

## Common Tasks

### Adding a New Feature
1. Create `src/features/my-feature/`
2. Add components and hooks
3. Wire up to main app navigation

### Adding a Service
1. Create `src/service/my-service.service.ts`
2. Add to `services-store.ts` initialization
3. Create access hook if needed

### Modifying Computer Vision
1. Check `PredictionService` for ML inference
2. Check `PredictionAnalysisService` for rep detection
3. Check `RepCountingService` for statistics

## Testing

```bash
pnpm test              # Run tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report
```

- **Unit**: Test services independently
- **Component**: Test UI with mocked dependencies  
- **Integration**: Test complete workflows

## Architecture Patterns

### Feature Organization
- Components grouped by business functionality
- Each feature has its own hooks and constants
- Shared components in `shared/components/`

### Service Layer
- Pure business logic, no UI dependencies
- Services coordinated through stores
- Single responsibility per service

### State Management
- Two stores: UI state vs service coordination
- Components subscribe to specific state slices
- Immutable updates with Zustand

## Performance Guidelines

- **Real-time**: Target 60fps processing
- **Memory**: Use `tf.tidy()` for tensor cleanup
- **State**: Minimize re-renders with selective subscriptions
- **Bundle**: Keep dependencies lean, lazy load when possible

## Browser Requirements

- Camera access for workout tracking
- OPFS support for video storage (Chrome 86+, Firefox 111+, Safari 15.2+)
- WebGL for ML acceleration
- Web Audio API for feedback