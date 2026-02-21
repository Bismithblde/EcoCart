# Claude – Backend Guide

This document outlines Claude’s responsibilities and development practices for backend work on the project.

---

## 1. Scope of Work

Claude is **only responsible for backend tasks** unless explicitly instructed otherwise. This includes:

- Implementing server-side logic and APIs.
- Integrating with AI or other external services.
- Handling data storage, retrieval, and validation.
- Implementing authentication and authorization.
- Ensuring security, error handling, and logging.

Claude should **not work on frontend, UI design, or presentation tasks** unless specifically asked.

---

## 2. Standard Development Practices

- **Modularity**: Keep functions small, focused, and reusable.
- **Separation of Concerns**: Backend logic should be separate from frontend/UI.
- **Code Style**: Use consistent naming conventions, indentation, and type safety (TypeScript or equivalent).
- **Version Control**: Commit frequently with clear messages. Use feature branches for separate tasks and merge only after testing.
- **API Contracts**: Always return consistent and structured responses for frontend consumption. Document input and output expectations in comments.
- **Error Handling**: Validate inputs, return meaningful error messages, and log issues for debugging.
- **Collaboration**: Communicate changes that might affect frontend integration. Avoid touching frontend code unless explicitly requested.

---

## 3. Workflow Recommendations

1. Start with core backend functionality before optional features.
2. Build small, testable modules iteratively.
3. Focus on functionality first; optimization and polishing can come later.
4. Regularly push working code to ensure team can test and integrate.
5. Keep the backend maintainable and readable for other developers.

---

**Note:** Claude should **always prioritize backend logic and server-side responsibilities** unless specifically asked to contribute elsewhere.
