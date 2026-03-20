import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { formatCardText } from '../formatCardText';

describe('formatCardText', () => {
  // --- Pass-through cases ---
  it('returns null/undefined/empty as-is', () => {
    expect(formatCardText(null)).toBeNull();
    expect(formatCardText(undefined)).toBeUndefined();
    expect(formatCardText('')).toBe('');
  });

  it('returns plain string as-is', () => {
    expect(formatCardText('Deal 2 damage')).toBe('Deal 2 damage');
  });

  // --- Single token cases ---
  it('renders *italic* as <em>', () => {
    const { container } = render(<>{formatCardText('Apply *burning* to target')}</>);
    const em = container.querySelector('em');
    expect(em).not.toBeNull();
    expect(em.textContent).toBe('burning');
  });

  it('renders **bold** as <strong>', () => {
    const { container } = render(<>{formatCardText('Deal **3** damage')}</>);
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong.textContent).toBe('3');
  });

  it('renders ***keyword*** as styled <strong> with purple color', () => {
    const { container } = render(<>{formatCardText('Target ***marked*** drone')}</>);
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong.textContent).toBe('marked');
    expect(strong.style.color).toBe('var(--color-deployment)');
  });

  // --- Line breaks ---
  it('renders \\n as <br />', () => {
    const { container } = render(<>{formatCardText('Line 1\nLine 2')}</>);
    expect(container.querySelector('br')).not.toBeNull();
    expect(container.textContent).toBe('Line 1Line 2');
  });

  // --- Mixed content ---
  it('handles mixed tokens in one line', () => {
    const { container } = render(
      <>{formatCardText('Deal **3** damage to ***marked*** target')}</>
    );
    const strongs = container.querySelectorAll('strong');
    expect(strongs).toHaveLength(2);
    expect(strongs[0].textContent).toBe('3');
    expect(strongs[1].textContent).toBe('marked');
    expect(strongs[1].style.color).toBe('var(--color-deployment)');
  });

  // --- Unmatched asterisks ---
  it('passes through unmatched asterisks', () => {
    expect(formatCardText('3 * 4')).toBe('3 * 4');
  });

  it('passes through single asterisk without closing', () => {
    expect(formatCardText('boost *value by 2')).toBe('boost *value by 2');
  });
});
