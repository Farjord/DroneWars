/**
 * AssetPreloader Tests — Blob URL Preloading
 * TDD: Tests written first for fetch-to-blob preloading system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// We'll import AssetPreloader fresh for each test via dynamic import
// to avoid singleton state leaking between tests

describe('AssetPreloader - Blob URL Preloading', () => {
  let preloader;

  beforeEach(async () => {
    // Reset modules to get a fresh singleton each test
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();

    // Mock assetManifest to avoid importing real data files
    vi.doMock('../assetManifest.js', () => ({
      assetManifest: { testCategory: ['/img/test1.png', '/img/test2.png'] },
      getAllAssetPaths: () => ['/img/test1.png', '/img/test2.png'],
      default: { testCategory: ['/img/test1.png', '/img/test2.png'] }
    }));

    const module = await import('../AssetPreloader.js');
    preloader = module.default;
    preloader.reset();
  });

  describe('resolveUrl()', () => {
    it('should return original URL when image has not been preloaded', () => {
      const result = preloader.resolveUrl('/img/not-preloaded.png');
      expect(result).toBe('/img/not-preloaded.png');
    });

    it('should return undefined/null unchanged for null/undefined input', () => {
      expect(preloader.resolveUrl(undefined)).toBeUndefined();
      expect(preloader.resolveUrl(null)).toBeNull();
    });

    it('should return blob URL after successful preloadImage()', async () => {
      const fakeBlobUrl = 'blob:http://localhost/fake-uuid';
      const fakeBlob = new Blob(['fake'], { type: 'image/png' });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(fakeBlob)
      }));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue(fakeBlobUrl);

      await preloader.preloadImage('/img/test.png');

      expect(preloader.resolveUrl('/img/test.png')).toBe(fakeBlobUrl);
    });

    it('should return cached blob URL on duplicate preloadImage() call', async () => {
      const fakeBlobUrl = 'blob:http://localhost/fake-uuid';
      const fakeBlob = new Blob(['fake'], { type: 'image/png' });
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(fakeBlob)
      });

      vi.stubGlobal('fetch', fetchMock);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue(fakeBlobUrl);

      await preloader.preloadImage('/img/test.png');
      const result = await preloader.preloadImage('/img/test.png');

      expect(result).toBe(fakeBlobUrl);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling - failedAssets tracking', () => {
    it('should track failed fetches in failedAssets', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      }));

      await expect(preloader.preloadImage('/img/missing.png')).rejects.toThrow();
      expect(preloader.failedAssets).toContain('/img/missing.png');
    });

    it('should track network errors in failedAssets', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      await expect(preloader.preloadImage('/img/network-fail.png')).rejects.toThrow();
      expect(preloader.failedAssets).toContain('/img/network-fail.png');
    });

    it('should fall back to original URL for failed assets via resolveUrl()', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      }));

      try { await preloader.preloadImage('/img/missing.png'); } catch { /* expected */ }

      expect(preloader.resolveUrl('/img/missing.png')).toBe('/img/missing.png');
    });
  });

  describe('patchDataSources()', () => {
    it('should replace .image fields with blob URLs in data arrays', async () => {
      const mockData = [
        { name: 'Drone1', image: '/img/drone1.png' },
        { name: 'Drone2', image: '/img/drone2.png' }
      ];

      // Simulate preloaded assets
      preloader.loadedAssets.set('/img/drone1.png', 'blob:uuid-1');
      preloader.loadedAssets.set('/img/drone2.png', 'blob:uuid-2');

      preloader.patchDataSources([{ items: mockData, key: 'image' }]);

      expect(mockData[0].image).toBe('blob:uuid-1');
      expect(mockData[1].image).toBe('blob:uuid-2');
    });

    it('should leave items unchanged when no blob URL exists', async () => {
      const mockData = [
        { name: 'Drone1', image: '/img/unknown.png' }
      ];

      preloader.patchDataSources([{ items: mockData, key: 'image' }]);

      expect(mockData[0].image).toBe('/img/unknown.png');
    });

    it('should handle mixed patched/unpatched items', async () => {
      const mockData = [
        { name: 'A', image: '/img/a.png' },
        { name: 'B', image: '/img/b.png' },
        { name: 'C', image: '/img/c.png' }
      ];

      preloader.loadedAssets.set('/img/a.png', 'blob:a');
      preloader.loadedAssets.set('/img/c.png', 'blob:c');

      preloader.patchDataSources([{ items: mockData, key: 'image' }]);

      expect(mockData[0].image).toBe('blob:a');
      expect(mockData[1].image).toBe('/img/b.png');
      expect(mockData[2].image).toBe('blob:c');
    });

    it('should store original URLs for restoration', async () => {
      const mockData = [
        { name: 'Drone1', image: '/img/drone1.png' }
      ];

      preloader.loadedAssets.set('/img/drone1.png', 'blob:uuid-1');
      preloader.patchDataSources([{ items: mockData, key: 'image' }]);

      expect(preloader.originalUrls.size).toBe(1);
    });

    it('should patch different key names (imagePath, path)', () => {
      const aiData = [{ name: 'AI', imagePath: '/img/ai.png' }];
      const bgData = [{ name: 'BG', path: '/img/bg.jpg' }];

      preloader.loadedAssets.set('/img/ai.png', 'blob:ai');
      preloader.loadedAssets.set('/img/bg.jpg', 'blob:bg');

      preloader.patchDataSources([
        { items: aiData, key: 'imagePath' },
        { items: bgData, key: 'path' }
      ]);

      expect(aiData[0].imagePath).toBe('blob:ai');
      expect(bgData[0].path).toBe('blob:bg');
    });
  });

  describe('reset() - blob URL cleanup', () => {
    it('should revoke all blob URLs on reset', () => {
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', { ...URL, revokeObjectURL });

      preloader.loadedAssets.set('/img/a.png', 'blob:a');
      preloader.loadedAssets.set('/img/b.png', 'blob:b');

      preloader.reset();

      expect(revokeObjectURL).toHaveBeenCalledWith('blob:a');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:b');
    });

    it('should clear loadedAssets map after revocation', () => {
      preloader.loadedAssets.set('/img/a.png', 'blob:a');
      preloader.reset();
      expect(preloader.loadedAssets.size).toBe(0);
    });

    it('should restore original URLs to data sources on reset', () => {
      const mockData = [{ name: 'A', image: '/img/a.png' }];

      preloader.loadedAssets.set('/img/a.png', 'blob:a');
      preloader.patchDataSources([{ items: mockData, key: 'image' }]);

      expect(mockData[0].image).toBe('blob:a');

      preloader.reset();

      expect(mockData[0].image).toBe('/img/a.png');
    });
  });

  describe('resolveAssetUrl export', () => {
    it('should export resolveAssetUrl convenience function', async () => {
      const module = await import('../AssetPreloader.js');
      expect(typeof module.resolveAssetUrl).toBe('function');
    });

    it('should delegate to preloader.resolveUrl()', async () => {
      const module = await import('../AssetPreloader.js');
      preloader.loadedAssets.set('/img/x.png', 'blob:x');
      expect(module.resolveAssetUrl('/img/x.png')).toBe('blob:x');
    });
  });
});
