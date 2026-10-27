# Agent Coding Guidelines: ub-mode (Uncle Bob)

For any code written, refactored, or modified in this repository, strictly adhere to **`ub-mode`** principles:

## 1. First Make it Work
- **Laziness Protocol**:
  - One decision lives in one place.
  - Ship the smallest edit that solves the problem.
- **Foundational Thinking**:
  - Get the data shape right before writing logic.
  - Do first whatever helps every later phase.
  - If a concurrent writer would matter, do not share state.
- **TDD (Test-Driven Development)**:
  - Write the failing test before changing code.
  - See it fail for the reason expected.
  - Make the smallest change that makes it pass.
  - If an honest test is impractical, do not write a bad one.
- **Redesign From First Principles**:
  - Do not bolt new requirements onto old designs.
  - Deliver clean, modular increments.
- **Attack the Premise**:
  - If fixes fail the same gate, isolate and remove flawed assumptions.
- **Subtract Before You Add**:
  - Remove complexity before introducing new code.
- **Outcome-Oriented Execution & Build the Lever**:
  - Target verified end states; build automation/tools for repetitive tasks.
- **Architecture**:
  - Model domain to make illegal states unrepresentable.
  - Boundary discipline: parse at boundaries, trust internally, pure domain logic.
  - Make operations idempotent.
  - Separate shared state before serializing.

## 2. Then Make it Right
- **Fix Root Causes**:
  - Reproduce first, fix the root cause. Never use band-aid guards that hide defects.
- **Sequence Work into Verifiable Units**:
  - Complete and verify one small unit before beginning the next.
- **Test Behavior, Not Implementation**:
  - Tests call public interfaces and verify observable results.
- **Code Quality Gates**:
  - Maintain low cyclomatic complexity (CRAP < 10).
  - Eliminate duplication (Dryer < 0.8).
  - High test mutation resistance (kill mutants, remove dead code).
  - Safe refactoring: preserve existing behavior proven by tests.

## 3. Practice
- **Keep a Log**: Track actions taken and reasons why; report upon completion.
- **Guard the Context Window**: Keep discussions and context focused and minimal.
- **Commit & Push**:
  - Commit often in small, logical, ordered commits.
  - Each commit explains why, what changed, and how it was proven.
