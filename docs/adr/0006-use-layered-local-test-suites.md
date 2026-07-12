# Use layered local test suites

Test behavior at the lowest layer that provides sufficient confidence: Vitest covers server units, DOM components, real-browser components, database integration, and route integration, while Playwright verifies critical journeys against a production Next.js build. The separation keeps fast checks cheap without treating simulated framework behavior as end-to-end proof; database-backed suites remain local and sequential under ADR 0003.
