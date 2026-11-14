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
          Curated starter photography and local asset management.
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

      {/* Live Search feature with Coming Soon frosted overlay */}
      <div
        style={{
          position: 'relative',
          borderRadius: 6,
          border: '1px solid var(--hairline)',
          background: 'var(--bg, #141414)',
          padding: '10px 12px',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            opacity: 0.35,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
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
              background: 'rgba(0, 0, 0, 0.2)',
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

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(18, 18, 18, 0.85)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '8px 12px',
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.3,
              padding: '2px 8px',
              borderRadius: 10,
              background: 'rgba(49, 130, 206, 0.15)',
              border: '1px solid var(--accent, #3182ce)',
              color: 'var(--accent, #60a5fa)',
            }}
          >
            Live Unsplash &amp; Pexels Search (Coming Soon)
          </span>
          <span
            style={{
              fontSize: 10,
              color: 'var(--muted)',
              lineHeight: 1.35,
              maxWidth: 320,
            }}
          >
            Direct live API search will be available in an upcoming release. In
            the meantime, use the curated starter assets or drag and drop your
            own images below.
          </span>
        </div>
      </div>

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
            : 'var(--bg, #141414)',
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

      {/* Curated Starter Photos Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginTop: 2,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600 }}>
          Curated Starter Photos
        </span>

        {/* Category Pills */}
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
                onClick={() => setCategoryFilter(cat)}
                style={{
                  fontSize: 10,
                  padding: '2px 7px',
                  borderRadius: 10,
                  border:
                    categoryFilter === cat
                      ? '1px solid var(--accent, #3182ce)'
                      : '1px solid var(--hairline)',
                  background:
                    categoryFilter === cat
                      ? 'var(--accent, #3182ce)'
                      : 'transparent',
                  color: categoryFilter === cat ? '#fff' : 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Photo Cards Grid */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginTop: 2,
        }}
      >
        {loading ? (
          <p className="hint" style={{ fontSize: 11, margin: 0 }}>
            Loading curated collection…
          </p>
        ) : displayedPhotos.length === 0 ? (
          <p className="hint" style={{ fontSize: 11, margin: 0 }}>
            No photos found in category "{categoryFilter}".
          </p>
        ) : (
          displayedPhotos.map((photo) => (
            <div
              key={photo.id}
              style={{
                borderRadius: 6,
                border: '1px solid var(--hairline)',
                background: 'var(--bg, #141414)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  height: 110,
                  width: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#0a0a0a',
                }}
              >
                <img
                  src={photo.thumbUrl}
                  alt={photo.title}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    fontSize: 9,
                    background: 'rgba(0,0,0,0.65)',
                    color: '#fff',
                    padding: '1px 5px',
                    borderRadius: 3,
                  }}
                >
                  {photo.source}
                </span>
              </div>

              <div
                style={{
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {photo.title}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                    By {photo.photographer} ·{' '}
                    <a
                      href={photo.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'inherit', textDecoration: 'underline' }}
                    >
                      View on {photo.source}
                    </a>
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    type="button"
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
