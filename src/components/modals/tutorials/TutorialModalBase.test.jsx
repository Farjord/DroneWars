/**
 * TutorialModalBase.test.jsx
 * TDD tests for TutorialModalBase component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TutorialModalBase from './TutorialModalBase.jsx';

describe('TutorialModalBase', () => {
  const defaultProps = {
    title: 'Test Tutorial',
    subtitle: 'Test Subtitle',
    sections: [
      { heading: 'Section 1', content: 'This is section 1 content' },
      { heading: 'Section 2', content: 'This is section 2 content' },
    ],
    onDismiss: vi.fn(),
  };

  it('should render title', () => {
    render(<TutorialModalBase {...defaultProps} />);

    expect(screen.getByText('Test Tutorial')).toBeInTheDocument();
  });

  it('should render subtitle', () => {
    render(<TutorialModalBase {...defaultProps} />);

    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('should render section headings', () => {
    render(<TutorialModalBase {...defaultProps} />);

    expect(screen.getByText('Section 1')).toBeInTheDocument();
    expect(screen.getByText('Section 2')).toBeInTheDocument();
  });

  it('should render section content', () => {
    render(<TutorialModalBase {...defaultProps} />);

    expect(screen.getByText('This is section 1 content')).toBeInTheDocument();
    expect(screen.getByText('This is section 2 content')).toBeInTheDocument();
  });

  it('should call onDismiss when Got it button clicked', () => {
    render(<TutorialModalBase {...defaultProps} />);

    const button = screen.getByRole('button', { name: /Got it/i });
    fireEvent.click(button);

    expect(defaultProps.onDismiss).toHaveBeenCalled();
  });

  it('should call onDismiss when overlay clicked', () => {
    const { container } = render(<TutorialModalBase {...defaultProps} />);

    const overlay = container.querySelector('.dw-modal-overlay');
    fireEvent.click(overlay);

    expect(defaultProps.onDismiss).toHaveBeenCalled();
  });

  it('should not call onDismiss when modal content clicked', () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <TutorialModalBase {...defaultProps} onDismiss={onDismiss} />
    );

    const content = container.querySelector('.dw-modal-content');
    fireEvent.click(content);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('should show Skip All button when showSkipAll is true', () => {
    const onSkipAll = vi.fn();
    render(
      <TutorialModalBase {...defaultProps} showSkipAll={true} onSkipAll={onSkipAll} />
    );

    expect(screen.getByRole('button', { name: /Skip All/i })).toBeInTheDocument();
  });

  it('should not show Skip All button when showSkipAll is false', () => {
    render(<TutorialModalBase {...defaultProps} showSkipAll={false} />);

    expect(screen.queryByRole('button', { name: /Skip All/i })).not.toBeInTheDocument();
  });

  it('should call onSkipAll when Skip All button clicked', () => {
    const onSkipAll = vi.fn();
    render(
      <TutorialModalBase {...defaultProps} showSkipAll={true} onSkipAll={onSkipAll} />
    );

    const button = screen.getByRole('button', { name: /Skip All/i });
    fireEvent.click(button);

    expect(onSkipAll).toHaveBeenCalled();
  });

  it('should render custom children instead of sections', () => {
    render(
      <TutorialModalBase
        title="Custom Content"
        subtitle="With children"
        onDismiss={vi.fn()}
      >
        <div data-testid="custom-child">Custom content here</div>
      </TutorialModalBase>
    );

    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
    expect(screen.getByText('Custom content here')).toBeInTheDocument();
  });
});
