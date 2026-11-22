// Photography for the design-direction cards: one hero per direction, so the
// card shows the kind of business the direction was built for. Filenames are the
// brief each image was generated from; the keys are the app's direction ids.
import afterHours from './after-hours.webp';
import bigIdea from './big-idea.webp';
import goodMeasure from './good-measure.webp';
import littleNeighbours from './little-neighbours.webp';
import longLunch from './long-lunch.webp';
import openHouse from './open-house.webp';
import quietFrame from './quiet-frame.webp';
import softRitual from './soft-ritual.webp';
import solidGround from './solid-ground.webp';
import theEdit from './the-edit.webp';

export const directionImages: Record<string, string> = {
  'long-lunch': longLunch,
  'clear-ground': goodMeasure,
  'solid-ground': solidGround,
  'silver-screen': bigIdea,
  'the-edit': theEdit,
  'after-hours': afterHours,
  'open-house': littleNeighbours,
  componine: openHouse,
  'niki-studio': softRitual,
  'henry-from-online': quietFrame,
};
