# Documentation

Essential documentation for the Kettlebell Workout Tracker.

## 📋 Quick Reference

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Core patterns and system design | Understanding the codebase structure |
| **[DEVELOPMENT.md](./DEVELOPMENT.md)** | Setup and common development tasks | Getting started, adding features |
| **[SERVICES.md](./SERVICES.md)** | Service responsibilities and APIs | Working with business logic |
| **[WORKFLOW.md](./WORKFLOW.md)** | Complete service interaction flow | Understanding how everything connects |

## 🚀 Getting Started

1. **New Developer?** Start with [DEVELOPMENT.md](./DEVELOPMENT.md)
2. **Understanding Architecture?** Read [ARCHITECTURE.md](./ARCHITECTURE.md)  
3. **Working with Services?** Check [SERVICES.md](./SERVICES.md)
4. **How does it all work?** Follow [WORKFLOW.md](./WORKFLOW.md)

## 🏗️ System Overview

The application follows a layered architecture:

```
UI Components → Custom Hooks → Zustand Stores → Services → Browser APIs
```

### Key Concepts

- **Two-Store Pattern**: UI state vs service coordination
- **Service Layer**: Pure business logic with single responsibilities
- **Feature Organization**: Components grouped by business functionality
- **Real-time Pipeline**: 60fps computer vision processing

## 📖 Additional Resources

- **Main README**: Project overview and quick start
- **Code Comments**: Inline documentation for complex logic
- **TypeScript Types**: Living documentation through type definitions
- **Service Interfaces**: Clear contracts for each service

---

*Keep documentation simple, focused, and close to the code.*