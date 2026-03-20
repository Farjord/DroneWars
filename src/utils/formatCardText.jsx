import React from 'react';

const TOKEN_REGEX = /(\*{3}(.+?)\*{3})|(\*{2}(.+?)\*{2})|(\*([^*]+?)\*)/g;

function formatSegment(segment, lineIdx) {
  const matches = [...segment.matchAll(TOKEN_REGEX)];
  if (matches.length === 0) return segment;

  const parts = [];
  let lastIndex = 0;

  for (const match of matches) {
    if (match.index > lastIndex) {
      parts.push(segment.slice(lastIndex, match.index));
    }

    const key = `${lineIdx}-${match.index}`;
    if (match[2]) {
      // ***keyword*** → styled strong (purple)
      parts.push(
        <strong key={key} style={{ color: 'var(--color-deployment)' }}>{match[2]}</strong>
      );
    } else if (match[4]) {
      // **bold** → strong
      parts.push(<strong key={key}>{match[4]}</strong>);
    } else if (match[6]) {
      // *italic* → em
      parts.push(<em key={key}>{match[6]}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < segment.length) {
    parts.push(segment.slice(lastIndex));
  }

  return parts;
}

export function formatCardText(text) {
  if (text == null || text === '') return text;
  if (typeof text !== 'string') return text;

  const lines = text.split('\n');
  const hasMarkup = TOKEN_REGEX.test(text) || lines.length > 1;
  TOKEN_REGEX.lastIndex = 0; // Reset after .test()

  if (!hasMarkup) return text;

  const elements = [];
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) elements.push(<br key={`br-${i}`} />);
    const segment = formatSegment(lines[i], i);
    if (Array.isArray(segment)) {
      elements.push(...segment);
    } else {
      elements.push(segment);
    }
  }

  return <>{elements}</>;
}
