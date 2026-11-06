export function App() {
  return (
    <main className="home">
      <div className="home-mark" aria-hidden="true" />
      <h1>Cauldron</h1>
      <p className="home-line">
        Design and build real Astro websites, with taste.
      </p>
      <p className="home-meta">
        Version {window.cauldron?.version || '0.0.1'} ·{' '}
        {window.cauldron?.platform === 'darwin'
          ? 'Mac'
          : window.cauldron?.platform}
      </p>
    </main>
  );
}
