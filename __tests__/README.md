# Tests

This directory contains tests for bwave.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests matching a pattern
npm test -- UploadForm
```

## Test Structure

```
__tests__/
├── components/       # Component tests (UploadForm, SignOutButton, etc.)
├── lib/             # Server logic tests (upload, auth, etc.)
└── README.md        # This file
```

## Writing Tests

### Component Tests
Test UI behavior and interactions:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('handles user interactions', () => {
    render(<MyComponent />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Clicked')).toBeInTheDocument()
  })
})
```

### Server Action Tests
Test business logic with mocked Supabase:

```typescript
import { uploadFile } from '@/lib/server/upload'

jest.mock('@/lib/supabase-server')

describe('uploadFile', () => {
  it('validates file type', async () => {
    const formData = new FormData()
    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    formData.append('file', file)

    const result = await uploadFile(formData)
    expect(result).toEqual({ error: 'Only PDF and image files are supported' })
  })
})
```

## Pre-commit Hooks

Tests automatically run on commit via Husky:

1. **Linting**: `next lint --fix` fixes TypeScript/ESLint issues
2. **Tests**: `jest --bail --findRelatedTests` runs tests for changed files

If tests fail, the commit is blocked. Fix issues and try again.

To skip hooks (not recommended):
```bash
git commit --no-verify
```

## Coverage

View test coverage:
```bash
npm test -- --coverage
```

We aim for:
- Components: 80%+ coverage
- Server actions: 90%+ coverage
- Edge cases and error paths should be tested

## Mocking Guide

### Supabase Mocking
```typescript
jest.mock('@/lib/supabase-server', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: mockUser } }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData }),
    })),
  })),
}))
```

### Next.js Router Mocking
```typescript
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    refresh: jest.fn(),
  })),
}))
```

## Common Assertions

```typescript
// Element presence
expect(screen.getByText('Hello')).toBeInTheDocument()
expect(screen.getByRole('button')).toBeEnabled()

// Visibility
expect(screen.getByText('Error')).toBeVisible()

// Forms
expect(screen.getByLabelText('Email')).toHaveValue('test@example.com')

// Async
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
})
```

## Debugging Tests

Print to console during test:
```typescript
screen.debug() // Prints full DOM
screen.logTestingPlaygroundURL() // Opens Testing Playground
```

Run single test:
```bash
npm test -- UploadForm.test.tsx --testNamePattern="shows error"
```
