import { useEffect, useState, useRef } from 'react';

type Props = {
  site: CauldronSite | null;
  direction: CauldronDirectionSummary | null;
  selection?: CauldronSelection | null;
  onApplyAttribute?: (name: string, value: string | null) => void;
};

export function AssetTray({
  site: _site,
  direction,
  selection,
  onApplyAttribute,
}: Props) {
  const [photos, setPhotos] = useState<CauldronStockPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchPhotos = async (searchQuery = '', dirId?: string) => {
    setLoading(true);
    try {
      const results = await window.cauldron.stockPhotos(
        searchQuery,
        dirId || undefined,
      );
      setPhotos(results);
    } catch {
      // Fallback
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPhotos('', direction?.id);
  }, [direction?.id]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatusMessage('Please choose an image file (PNG, JPG, SVG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (!base64) return;
      const res = await window.cauldron.saveAssetImage({
        fileName: file.name,
        base64,
      });
      if (res.ok) {
        setStatusMessage(`Saved ${file.name} to ${res.relativePath}`);
        if (selection && onApplyAttribute && selection.name === 'img') {
          onApplyAttribute('src', res.relativePath);
        }
      } else {
        setStatusMessage(res.problem ?? 'Failed to save asset.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSavePhotoToSite = async (photo: CauldronStockPhoto) => {
    setStatusMessage(`Importing ${photo.title}…`);
    try {
      const res = await window.cauldron.saveStockPhoto({
        photoId: photo.id,
        url: photo.fullUrl,
      });
      if (res.ok) {
        setStatusMessage(`Saved to ${res.relativePath}`);
        if (selection && onApplyAttribute && selection.name === 'img') {
          onApplyAttribute('src', res.relativePath);
        }
      } else {
        const problem = res.problem ?? 'Import failed.';
        console.error(problem);
        setStatusMessage(problem);
      }
    } catch (e) {
      const problem = `Download failed: ${e instanceof Error ? e.message : String(e)}`;
      console.error(problem);
      setStatusMessage(problem);
    }
  };

  // Derive categories
  const categories = [
    'All',
    ...Array.from(new Set(photos.map((p) => p.category))),
  ];
  const displayedPhotos =
    categoryFilter === 'All'
      ? photos
      : photos.filter((p) => p.category === categoryFilter);

  return (
    <div
      className="asset-tray-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '12px 14px',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.01 }}>
          Photography &amp; Assets
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          Local asset management (stock photography is coming soon).
        </span>
      </div>

      {statusMessage && (
        <div
          className="notice"
          style={{ fontSize: 11, padding: '6px 8px', margin: 0 }}
          role="status"
        >
          {statusMessage}
        </div>
      )}

      {/* Drag & Drop Target for local files */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging
            ? '2px dashed var(--accent, #3182ce)'
            : '1px dashed var(--hairline)',
          borderRadius: 6,
          padding: '10px 12px',
          textAlign: 'center',
          background: isDragging
            ? 'rgba(49, 130, 206, 0.08)'
            : 'var(--panel-sunken)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              void handleFile(e.target.files[0]);
            }
          }}
        />
        <div style={{ fontSize: 11, fontWeight: 600 }}>
          Drag an image here, or click to upload
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
          Saved directly into <code className="mono">public/images/</code>
        </div>
      </div>

      {/* Greyed-out Stock Photos & Live Search section with COMING SOON overlay */}
      <div
        aria-disabled="true"
        style={{
          position: 'relative',
          borderRadius: 6,
          border: '1px solid var(--hairline)',
          background: 'var(--panel)',
          padding: 12,
          overflow: 'hidden',
          minHeight: 280,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            opacity: 0.25,
            filter: 'grayscale(100%)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              Stock Photography
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="text"
                tabIndex={-1}
                readOnly
                placeholder="Search Unsplash &amp; Pexels photos…"
                style={{
                  flex: 1,
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--hairline)',
                  background: 'var(--panel-sunken)',
                  color: 'inherit',
                }}
              />
              <button
                type="button"
                tabIndex={-1}
                disabled
                className="button"
                style={{ fontSize: 11, padding: '4px 8px' }}
              >
                Search
              </button>
            </div>
          </div>

          {categories.length > 1 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
                alignItems: 'center',
              }}
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  tabIndex={-1}
                  disabled
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    fontSize: 10,
                    padding: '2px 7px',
                    borderRadius: 10,
                    border: '1px solid var(--hairline)',
                    background: 'transparent',
                    color: 'var(--muted)',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <p className="hint" style={{ fontSize: 11, margin: 0 }}>
              Loading stock photography…
            </p>
          ) : displayedPhotos.length > 0 ? (
            displayedPhotos.map((photo) => (
              <div
                key={photo.id}
                style={{
                  borderRadius: 6,
                  border: '1px solid var(--hairline)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <img
                  src={photo.thumbUrl}
                  alt={photo.title}
                  loading="lazy"
                  style={{ width: '100%', height: 96, objectFit: 'cover' }}
                />
                <div style={{ padding: '8px 10px', display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled
                    className="button"
                    style={{ flex: 1, fontSize: 10, padding: '3px 6px' }}
                    onClick={() => void handleSavePhotoToSite(photo)}
                  >
                    Save to /images/
                  </button>
                  {selection &&
                    onApplyAttribute &&
                    selection.name === 'img' && (
                      <button
                        type="button"
                        tabIndex={-1}
                        disabled
                        className="button primary"
                        style={{ fontSize: 10, padding: '3px 6px' }}
                        onClick={() => {
                          onApplyAttribute('src', photo.fullUrl);
                          setStatusMessage(`Applied ${photo.title} to image.`);
                        }}
                      >
                        Set as img src
                      </button>
                    )}
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 8,
              }}
            >
              {[1, 2, 3, 4].map((slot) => (
                <div
                  key={slot}
                  style={{
                    borderRadius: 6,
                    border: '1px solid var(--hairline)',
                    overflow: 'hidden',
                    background: 'var(--panel-sunken)',
                  }}
                >
                  <div
                    style={{
                      height: 76,
                      background:
                        'repeating-linear-gradient(135deg, rgba(128,128,128,0.12) 0 8px, rgba(128,128,128,0.06) 8px 16px)',
                    }}
                  />
                  <div
                    style={{
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 5,
                    }}
                  >
                    <div
                      style={{
                        height: 8,
                        width: '72%',
                        borderRadius: 3,
                        background: 'rgba(128,128,128,0.28)',
                      }}
                    />
                    <div
                      style={{
                        height: 7,
                        width: '48%',
                        borderRadius: 3,
                        background: 'rgba(128,128,128,0.2)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(18, 18, 18, 0.82)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '16px 14px',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: 999,
              background: 'var(--primary)',
              border: '1px solid var(--primary)',
              color: 'var(--primary-text)',
            }}
          >
            COMING SOON
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#ffffff',
            }}
          >
            Live Unsplash &amp; Pexels Stock Photos
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'rgba(255, 255, 255, 0.82)',
              lineHeight: 1.4,
              maxWidth: 280,
            }}
          >
            Built-in stock photography is disabled until live Unsplash &amp;
            Pexels search is connected. Drag or upload your own images above for
            now.
          </span>
        </div>
      </div>
    </div>
  );
}
