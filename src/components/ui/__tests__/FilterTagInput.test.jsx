import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterTagInput from '../FilterTagInput.jsx';

describe('FilterTagInput', () => {
  it('renders with placeholder when no keywords', () => {
    render(<FilterTagInput keywords={[]} onKeywordsChange={() => {}} placeholder="Search..." />);
    expect(screen.getByPlaceholderText('Search...')).toBeDefined();
  });

  it('adds keyword on Enter', () => {
    const onChange = vi.fn();
    render(<FilterTagInput keywords={[]} onKeywordsChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'laser' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['laser']);
  });

  it('does not add empty keyword', () => {
    const onChange = vi.fn();
    render(<FilterTagInput keywords={[]} onKeywordsChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not add duplicate keyword', () => {
    const onChange = vi.fn();
    render(<FilterTagInput keywords={['laser']} onKeywordsChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'laser' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes keyword on chip X click', () => {
    const onChange = vi.fn();
    render(<FilterTagInput keywords={['laser', 'blast']} onKeywordsChange={onChange} />);

    const removeButtons = screen.getAllByLabelText(/^Remove /);
    fireEvent.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith(['blast']);
  });

  it('removes last keyword on Backspace with empty input', () => {
    const onChange = vi.fn();
    render(<FilterTagInput keywords={['laser', 'blast']} onKeywordsChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(onChange).toHaveBeenCalledWith(['laser']);
  });

  it('does not remove keyword on Backspace when input has text', () => {
    const onChange = vi.fn();
    render(<FilterTagInput keywords={['laser']} onKeywordsChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'bl' } });
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders keyword chips', () => {
    render(<FilterTagInput keywords={['laser', 'blast']} onKeywordsChange={() => {}} />);

    expect(screen.getByText('laser')).toBeDefined();
    expect(screen.getByText('blast')).toBeDefined();
  });

  // --- New tests for chips prop ---

  it('renders filter chips from chips prop alongside keyword chips', () => {
    const chips = [
      { label: 'Rarity: Rare', filterType: 'rarity', filterValue: 'rare' },
      { label: 'Type: Ordnance', filterType: 'type', filterValue: 'Ordnance' },
    ];
    render(
      <FilterTagInput
        keywords={['laser']}
        onKeywordsChange={() => {}}
        chips={chips}
        onRemoveChip={() => {}}
      />
    );

    expect(screen.getByText('Rarity: Rare')).toBeDefined();
    expect(screen.getByText('Type: Ordnance')).toBeDefined();
    expect(screen.getByText('laser')).toBeDefined();
  });

  it('calls onRemoveChip with filterType and filterValue when filter chip X is clicked', () => {
    const onRemoveChip = vi.fn();
    const chips = [
      { label: 'Rarity: Rare', filterType: 'rarity', filterValue: 'rare' },
    ];
    render(
      <FilterTagInput
        keywords={[]}
        onKeywordsChange={() => {}}
        chips={chips}
        onRemoveChip={onRemoveChip}
      />
    );

    const removeBtn = screen.getByLabelText('Remove filter: Rarity: Rare');
    fireEvent.click(removeBtn);

    expect(onRemoveChip).toHaveBeenCalledWith('rarity', 'rare');
  });

  it('backspace with empty input removes last keyword, not filter chips', () => {
    const onChange = vi.fn();
    const onRemoveChip = vi.fn();
    const chips = [
      { label: 'Rarity: Rare', filterType: 'rarity', filterValue: 'rare' },
    ];
    render(
      <FilterTagInput
        keywords={['laser']}
        onKeywordsChange={onChange}
        chips={chips}
        onRemoveChip={onRemoveChip}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(onChange).toHaveBeenCalledWith([]);
    expect(onRemoveChip).not.toHaveBeenCalled();
  });

  it('hides placeholder when filter chips are present even without keywords', () => {
    const chips = [
      { label: 'Rarity: Rare', filterType: 'rarity', filterValue: 'rare' },
    ];
    render(
      <FilterTagInput
        keywords={[]}
        onKeywordsChange={() => {}}
        chips={chips}
        onRemoveChip={() => {}}
        placeholder="Search..."
      />
    );

    expect(screen.queryByPlaceholderText('Search...')).toBeNull();
  });
});
