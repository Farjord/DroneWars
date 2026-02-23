import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'

// ========================================
// EXTRACTION CONFIRM MODAL TESTS
// ========================================
// Tests for the extraction confirmation modal with scanning animation

// Mock ExtractionController
vi.mock('../../../logic/singlePlayer/ExtractionController.js', () => ({
  default: {
    checkBlockade: vi.fn()
  }
}))

// Import after mock setup
import ExtractionConfirmModal from '../ExtractionConfirmModal.jsx'
import ExtractionController from '../../../logic/singlePlayer/ExtractionController.js'

// Default props for testing
const createDefaultProps = () => ({
  detection: 30,
  onCancel: vi.fn(),
  onExtract: vi.fn(),
  onEngageCombat: vi.fn(),
  onQuickDeploy: vi.fn(),
  validQuickDeployments: []
})

describe('ExtractionConfirmModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ========================================
  // CONFIRMATION STATE TESTS
  // ========================================

  describe('confirmation state', () => {
    it('renders confirmation state initially', () => {
      const props = createDefaultProps()

      render(<ExtractionConfirmModal {...props} />)

      expect(screen.getByText('EXTRACTION POINT')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Extract')).toBeInTheDocument()
    })

    it('displays blockade risk percentage', () => {
      const props = createDefaultProps()
      props.detection = 45

      render(<ExtractionConfirmModal {...props} />)

      expect(screen.getByText('45%')).toBeInTheDocument()
      expect(screen.getByText('Extraction Blockade Chance')).toBeInTheDocument()
    })

    it('shows warning color when detection >= 50%', () => {
      const props = createDefaultProps()
      props.detection = 55

      render(<ExtractionConfirmModal {...props} />)

      const riskValue = screen.getByText('55%')
      expect(riskValue).toHaveClass('extraction-risk-warning')
    })

    it('shows critical color when detection >= 80%', () => {
      const props = createDefaultProps()
      props.detection = 85

      render(<ExtractionConfirmModal {...props} />)

      const riskValue = screen.getByText('85%')
      expect(riskValue).toHaveClass('extraction-risk-critical')
    })

    it('Cancel button calls onCancel', () => {
      const props = createDefaultProps()

      render(<ExtractionConfirmModal {...props} />)
      fireEvent.click(screen.getByText('Cancel'))

      expect(props.onCancel).toHaveBeenCalledTimes(1)
    })

    it('Extract button starts scanning', () => {
      const props = createDefaultProps()
      ExtractionController.checkBlockade.mockReturnValue(false)

      render(<ExtractionConfirmModal {...props} />)
      fireEvent.click(screen.getByText('Extract'))

      // Should transition to scanning state
      expect(screen.getByText('INITIATING EXTRACTION')).toBeInTheDocument()
    })
  })

  // ========================================
  // SCANNING STATE TESTS
  // ========================================

  describe('scanning state', () => {
    it('shows progress bar during scanning', () => {
      const props = createDefaultProps()
      ExtractionController.checkBlockade.mockReturnValue(false)

      render(<ExtractionConfirmModal {...props} />)
      fireEvent.click(screen.getByText('Extract'))

      expect(screen.getByTestId('extraction-progress-bar')).toBeInTheDocument()
    })

    it('displays scan messages during scanning', () => {
      const props = createDefaultProps()
      ExtractionController.checkBlockade.mockReturnValue(false)

      render(<ExtractionConfirmModal {...props} />)
      fireEvent.click(screen.getByText('Extract'))

      // Should show one of the scan messages
      const scanMessages = [
        'Calculating exit vector...',
        'Scanning for patrols...',
        'Avoiding detection zones...',
        'Locking extraction coordinates...',
        'Securing escape route...',
        'Evading hostile signatures...'
      ]

      const messageElement = screen.getByTestId('scan-message')
      expect(scanMessages).toContain(messageElement.textContent)
    })

    it('disables buttons during scanning', () => {
      const props = createDefaultProps()
      ExtractionController.checkBlockade.mockReturnValue(false)

      render(<ExtractionConfirmModal {...props} />)
      fireEvent.click(screen.getByText('Extract'))

      // Cancel and Extract buttons should not be present during scanning
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Extract' })).not.toBeInTheDocument()
    })

    it('calls onExtract when scan completes and no blockade', async () => {
      const props = createDefaultProps()
      ExtractionController.checkBlockade.mockReturnValue(false)

      render(<ExtractionConfirmModal {...props} />)
      fireEvent.click(screen.getByText('Extract'))

      // Fast-forward through scan animation (2 seconds)
      await act(async () => {
        vi.advanceTimersByTime(2500)
      })

      expect(props.onExtract).toHaveBeenCalledTimes(1)
    })
  })

  // ========================================
  // BLOCKED STATE TESTS
  // ========================================

  describe('blocked state', () => {
    it('shows blocked state when blockade is triggered', async () => {
      const props = createDefaultProps()
      ExtractionController.checkBlockade.mockReturnValue(true)

      render(<ExtractionConfirmModal {...props} />)
      fireEvent.click(screen.getByText('Extract'))

      // Fast-forward through scan animation
      await act(async () => {
        vi.advanceTimersByTime(2500)
      })

      expect(screen.getByText('BLOCKADE DETECTED')).toBeInTheDocument()
    })

    it('shows hostile contact alert when blocked', async () => {
      const props = createDefaultProps()
      ExtractionController.checkBlockade.mockReturnValue(true)

      render(<ExtractionConfirmModal {...props} />)
      fireEvent.click(screen.getByText('Extract'))

      await act(async () => {
        vi.advanceTimersByTime(2500)
      })

      expect(screen.getByText('HOSTILE CONTACT DETECTED')).toBeInTheDocument()
    })

    it('shows single Engage Enemy button when no quick deployments', async () => {
      const props = createDefaultProps()
      props.validQuickDeployments = []
      ExtractionController.checkBlockade.mockReturnValue(true)

      render(<ExtractionConfirmModal {...props} />)
      fireEvent.click(screen.getByText('Extract'))

      await act(async () => {
        vi.advanceTimersByTime(2500)
      })

      expect(screen.getByText('Engage Enemy')).toBeInTheDocument()
      expect(screen.queryByText('Quick Deploy')).not.toBeInTheDocument()
    })

    it('shows split buttons when quick deployments available', async () => {
      const props = createDefaultProps()
      props.validQuickDeployments = [{ id: 'test-deploy', name: 'Test Deploy' }]
      ExtractionController.checkBlockade.mockReturnValue(true)

      render(<ExtractionConfirmModal {...props} />)
      fireEvent.click(screen.getByText('Extract'))

      await act(async () => {
        vi.advanceTimersByTime(2500)
      })

      expect(screen.getByText('Standard Deploy')).toBeInTheDocument()
      expect(screen.getByText('Quick Deploy')).toBeInTheDocument()
    })

    it('Engage Enemy calls onEngageCombat', async () => {
      const props = createDefaultProps()
      ExtractionController.checkBlockade.mockReturnValue(true)

      render(<ExtractionConfirmModal {...props} />)
      fireEvent.click(screen.getByText('Extract'))

      await act(async () => {
        vi.advanceTimersByTime(2500)
      })

      expect(screen.getByText('Engage Enemy')).toBeInTheDocument()
      fireEvent.click(screen.getByText('Engage Enemy'))
      expect(props.onEngageCombat).toHaveBeenCalledTimes(1)
    })

    it('Standard Deploy calls onEngageCombat when quick deploys available', async () => {
      const props = createDefaultProps()
      props.validQuickDeployments = [{ id: 'test-deploy', name: 'Test Deploy' }]
      ExtractionController.checkBlockade.mockReturnValue(true)

      render(<ExtractionConfirmModal {...props} />)
      fireEvent.click(screen.getByText('Extract'))

      await act(async () => {
        vi.advanceTimersByTime(2500)
      })

      expect(screen.getByText('Standard Deploy')).toBeInTheDocument()
      fireEvent.click(screen.getByText('Standard Deploy'))
      expect(props.onEngageCombat).toHaveBeenCalledTimes(1)
    })

    it('Quick Deploy calls onQuickDeploy', async () => {
      const props = createDefaultProps()
      props.validQuickDeployments = [{ id: 'test-deploy', name: 'Test Deploy' }]
      ExtractionController.checkBlockade.mockReturnValue(true)

      render(<ExtractionConfirmModal {...props} />)
      fireEvent.click(screen.getByText('Extract'))

      await act(async () => {
        vi.advanceTimersByTime(2500)
      })

      expect(screen.getByText('Quick Deploy')).toBeInTheDocument()
      fireEvent.click(screen.getByText('Quick Deploy'))
      expect(props.onQuickDeploy).toHaveBeenCalledTimes(1)
    })
  })

  // ========================================
  // PROGRESS BAR TESTS
  // ========================================

  describe('progress bar', () => {
    it('starts at 0% when scanning begins', () => {
      const props = createDefaultProps()
      ExtractionController.checkBlockade.mockReturnValue(false)

      render(<ExtractionConfirmModal {...props} />)
      fireEvent.click(screen.getByText('Extract'))

      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('progress increases over time', () => {
      const props = createDefaultProps()
      ExtractionController.checkBlockade.mockReturnValue(false)

      render(<ExtractionConfirmModal {...props} />)
      fireEvent.click(screen.getByText('Extract'))

      // Advance half way through scan
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Should be around 50%
      const progressText = screen.getByTestId('progress-percent')
      const percent = parseInt(progressText.textContent)
      expect(percent).toBeGreaterThan(30)
      expect(percent).toBeLessThan(70)
    })
  })
})
