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
  const [query, setQuery] = useState('');
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
    void fetchPhotos(query, direction?.id);
  }, [direction?.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchPhotos(query, direction?.id);
  };

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
      const response = await fetch(photo.fullUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const fileName = `${photo.id}.jpg`;
        const res = await window.cauldron.saveAssetImage({
          fileName,
          base64,
        });
        if (res.ok) {
          setStatusMessage(`Saved to ${res.relativePath}`);
          if (selection && onApplyAttribute && selection.name === 'img') {
            onApplyAttribute('src', res.relativePath);
          }
        } else {
          setStatusMessage(res.problem ?? 'Import failed.');
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      setStatusMessage(
        `Download failed: ${e instanceof Error ? e.message : String(e)}`,
      );
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
          Photography & Assets
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          Royalty-free photography from Unsplash & Pexels for real work.
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

      {/* Search Input */}
      <form
        onSubmit={handleSearch}
        style={{ display: 'flex', gap: 6, alignItems: 'center' }}
      >
        <input
          type="text"
          placeholder="Search photos (coffee, tools, wood)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            fontSize: 11,
            padding: '4px 8px',
            borderRadius: 4,
            border: '1px solid var(--hairline)',
            background: 'var(--bg, #141414)',
            color: 'inherit',
          }}
        />
        <button
          type="submit"
          className="button"
          style={{ fontSize: 11, padding: '4px 8px' }}
        >
          Search
        </button>
      </form>

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

      {/* Photo Cards Grid */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginTop: 4,
        }}
      >
        {loading ? (
          <p className="hint" style={{ fontSize: 11, margin: 0 }}>
            Loading curated collection…
          </p>
        ) : displayedPhotos.length === 0 ? (
          <p className="hint" style={{ fontSize: 11, margin: 0 }}>
            No photos found matching "{query}".
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
