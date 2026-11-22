import { SitesIcon } from './Icons';

type Props = {
  /** What this screen does, in the person's words. */
  feature: string;
  onOpenSite: () => void;
  onNewProject: () => void;
};

/**
 * Shown instead of a site screen when no project is open.
 *
 * Before this, every site screen rendered its real controls with nothing
 * behind them: pressing "Use this direction" or opening Content did nothing
 * and said nothing, which reads as a broken app. A screen that cannot work
 * without a site now says so, and offers the two things that can help.
 */
export function NoSiteGate({ feature, onOpenSite, onNewProject }: Props) {
  return (
    <div className="no-site-gate">
      <SitesIcon size={28} />
      <h2>Open a site to use {feature}</h2>
      <p>
        Open a project and this screen fills with its own content. Nothing here
        is changed while no project is open.
      </p>
      <div className="no-site-gate-actions">
        <button className="button primary" type="button" onClick={onOpenSite}>
          Open a site
        </button>
        <button className="button quiet" type="button" onClick={onNewProject}>
          Start a new project
        </button>
      </div>
    </div>
  );
}
