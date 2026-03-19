import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const animDir = resolve(__dirname, '..');
const stylesDir = resolve(__dirname, '../../../styles');
const rootDir = resolve(__dirname, '../../..');

function readFile(path) {
  return readFileSync(path, 'utf-8');
}

describe('Keyframe Decoupling', () => {
  // --- Co-located CSS files contain their expected keyframes ---

  const coLocatedExpectations = [
    {
      file: 'TeleportEffect.css',
      keyframes: ['teleportRing', 'teleportGlow', 'teleportExpand', 'teleportParticle'],
    },
    {
      file: 'CardVisualEffect.css',
      keyframes: ['laserFade', 'energyPulse', 'nukeExpand', 'nukeFlash'],
    },
    {
      file: 'HealEffect.css',
      keyframes: ['healPulse', 'healFloat', 'healSparkle'],
    },
    {
      file: 'StatBuffEffect.css',
      keyframes: ['statSwirl', 'statZap', 'statGlow'],
    },
    {
      file: 'ExplosionEffect.css',
      keyframes: ['explosionParticle'],
    },
    {
      file: 'LaserEffect.css',
      keyframes: ['laserPulse'],
    },
    {
      file: 'revealOverlay.css',
      keyframes: ['cardRevealLabelShow', 'cardRevealDissolve', 'cardRevealScanline'],
    },
    {
      file: 'PhaseAnnouncementOverlay.css',
      keyframes: ['phaseAnnouncementScanline'],
    },
  ];

  describe('co-located CSS files contain expected keyframes', () => {
    coLocatedExpectations.forEach(({ file, keyframes }) => {
      it(`${file} defines ${keyframes.join(', ')}`, () => {
        const css = readFile(resolve(animDir, file));
        keyframes.forEach((kf) => {
          expect(css).toContain(`@keyframes ${kf}`);
        });
      });
    });
  });

  // --- Co-located CSS files contain expected classes ---

  it('revealOverlay.css defines card-reveal classes', () => {
    const css = readFile(resolve(animDir, 'revealOverlay.css'));
    expect(css).toContain('.card-reveal-label-show');
    expect(css).toContain('.card-reveal-dissolve');
    expect(css).toContain('.card-reveal-scanline-active');
  });

  it('PhaseAnnouncementOverlay.css defines .phase-announcement-scanline-active', () => {
    const css = readFile(resolve(animDir, 'PhaseAnnouncementOverlay.css'));
    expect(css).toContain('.phase-announcement-scanline-active');
  });

  // --- Extracted keyframes removed from global CSS ---

  const extractedKeyframes = [
    'teleportRing', 'teleportGlow', 'teleportExpand', 'teleportParticle',
    'laserFade', 'energyPulse', 'nukeExpand', 'nukeFlash',
    'healPulse', 'healFloat', 'healSparkle',
    'statSwirl', 'statZap', 'statGlow',
    'explosionParticle',
    'laserPulse',
    'cardRevealLabelShow', 'cardRevealDissolve', 'cardRevealScanline',
    'phaseAnnouncementScanline',
  ];

  describe('animations.css no longer contains extracted keyframes', () => {
    extractedKeyframes.forEach((kf) => {
      it(`does not contain @keyframes ${kf}`, () => {
        const css = readFile(resolve(stylesDir, 'animations.css'));
        expect(css).not.toContain(`@keyframes ${kf}`);
      });
    });
  });

  describe('index.css no longer contains extracted keyframes', () => {
    extractedKeyframes.forEach((kf) => {
      it(`does not contain @keyframes ${kf}`, () => {
        const css = readFile(resolve(rootDir, 'index.css'));
        expect(css).not.toContain(`@keyframes ${kf}`);
      });
    });
  });

  // --- Dead CSS removed ---

  it('animations.css does not contain dead .explosion class', () => {
    const css = readFile(resolve(stylesDir, 'animations.css'));
    expect(css).not.toMatch(/\.explosion\s*\{/);
  });

  it('animations.css does not contain dead .phase-announcement-text class', () => {
    const css = readFile(resolve(stylesDir, 'animations.css'));
    expect(css).not.toMatch(/\.phase-announcement-text\s*\{/);
  });

  it('index.css does not contain dead .explosion class', () => {
    const css = readFile(resolve(rootDir, 'index.css'));
    expect(css).not.toMatch(/\.explosion\s*\{/);
  });

  // --- JSX components import their CSS ---

  const componentImports = [
    { jsx: 'TeleportEffect.jsx', importPath: './TeleportEffect.css' },
    { jsx: 'CardVisualEffect.jsx', importPath: './CardVisualEffect.css' },
    { jsx: 'HealEffect.jsx', importPath: './HealEffect.css' },
    { jsx: 'StatBuffEffect.jsx', importPath: './StatBuffEffect.css' },
    { jsx: 'ExplosionEffect.jsx', importPath: './ExplosionEffect.css' },
    { jsx: 'LaserEffect.jsx', importPath: './LaserEffect.css' },
    { jsx: 'CardRevealOverlay.jsx', importPath: './revealOverlay.css' },
    { jsx: 'StatusConsumptionOverlay.jsx', importPath: './revealOverlay.css' },
    { jsx: 'PhaseAnnouncementOverlay.jsx', importPath: './PhaseAnnouncementOverlay.css' },
    { jsx: 'OverflowProjectile.jsx', importPath: '../../styles/animations.css' },
  ];

  describe('JSX components import their co-located CSS', () => {
    componentImports.forEach(({ jsx, importPath }) => {
      it(`${jsx} imports ${importPath}`, () => {
        const src = readFile(resolve(animDir, jsx));
        expect(src).toContain(`import '${importPath}'`);
      });
    });
  });
});
