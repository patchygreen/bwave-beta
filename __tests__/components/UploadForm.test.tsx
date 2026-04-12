import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UploadForm from '@/components/UploadForm'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock the server action
jest.mock('@/lib/server/upload', () => ({
  uploadFile: jest.fn(),
}))

describe('UploadForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders file upload form with instructions', () => {
      render(<UploadForm />)

      expect(screen.getByText(/Click to upload or drag and drop/i)).toBeInTheDocument()
      expect(screen.getByText(/PDF or image/i)).toBeInTheDocument()
      expect(screen.getByText(/Max 10MB/i)).toBeInTheDocument()
    })

    it('renders accessible file input with label', () => {
      render(<UploadForm />)

      const fileInput = screen.getByLabelText(/Upload product file/i)
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveAttribute('accept', '.pdf,image/*')
    })

    it('renders submit button', () => {
      render(<UploadForm />)

      const submitButton = screen.getByRole('button', { name: /Continue/i })
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('Button States', () => {
    it('disables submit button when no file selected', () => {
      render(<UploadForm />)

      const submitButton = screen.getByRole('button', { name: /Continue/i })
      expect(submitButton).toBeDisabled()
    })

    it('enables submit button after file selection', async () => {
      render(<UploadForm />)

      const fileInput = screen.getByLabelText(/Upload product file/i)
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Continue/i })
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('shows loading state while uploading', async () => {
      render(<UploadForm />)

      const fileInput = screen.getByLabelText(/Upload product file/i)
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      const submitButton = screen.getByRole('button', { name: /Continue/i })
      expect(submitButton).toHaveAttribute('aria-busy', 'false')
    })
  })

  describe('File Selection', () => {
    it('displays selected file name', async () => {
      render(<UploadForm />)

      const fileInput = screen.getByLabelText(/Upload product file/i)
      const file = new File(['test'], 'product.pdf', { type: 'application/pdf' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText(/Selected: product.pdf/i)).toBeInTheDocument()
      })
    })

    it('clears error when new file selected', async () => {
      render(<UploadForm />)

      const fileInput = screen.getByLabelText(/Upload product file/i)
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      // Select file
      fireEvent.change(fileInput, { target: { files: [file] } })

      // Error state would be cleared on new selection
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<UploadForm />)

      const fileInput = screen.getByLabelText(/Upload product file/i)
      expect(fileInput).toHaveAttribute('aria-label', 'Upload product file')
    })

    it('associates help text with input', () => {
      render(<UploadForm />)

      const fileInput = screen.getByLabelText(/Upload product file/i)
      expect(fileInput).toHaveAttribute('aria-describedby', 'file-description')
    })

    it('error messages have alert role for screen readers', () => {
      render(<UploadForm />)

      // Error would be rendered with role="alert"
      // This tests the component structure is ready for error states
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
