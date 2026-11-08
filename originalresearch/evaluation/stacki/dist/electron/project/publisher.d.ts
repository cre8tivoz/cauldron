import { type PublishTarget } from '../../shared/properties/publishConfig';
import { type DesktopPublishState } from '../../shared/properties/publishState';
export declare class DesktopPublisher {
    private project;
    private current;
    state(root: string): DesktopPublishState;
    start(root: string, target: PublishTarget, commitMessage?: string): DesktopPublishState;
    private publish;
    private push;
    private deploy;
    private fail;
}
