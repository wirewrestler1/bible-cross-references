/**
 * Words that say nothing about what a verse is about: the usual English function words, the
 * older forms the World English Bible keeps in places (`thee`, `unto`), and the few words so
 * common in scripture that they would draw every verse to every other (`lord`, `god`, `said`).
 * Used only by `compute-similarity.ts`.
 */
export const STOP_WORDS: ReadonlySet<string> = new Set([
  ...`a about above after again against all also am an and any are as at be because been
  before being below between both but by can could did do does doing down during each few for
  from further had has have having he her here hers herself him himself his how i if in into
  is it its itself just let me more most my myself no nor not now of off on once only or other
  our ours ourselves out over own same she should so some such than that the their theirs them
  themselves then there these they this those through to too under until up upon very was we
  were what when where which while who whom why will with would you your yours yourself
  yourselves`.split(/\s+/),
  // Older forms and the connectives of narrative.
  ...`thee thou thy thine ye unto hath hast doth dost shall shalt wilt art thereof therein
  thereby whereof wherefore therefore thus yet even every one ones two three another among
  behold came come go went gone said says saying say spoke speak made make making like
  may might must many much such things thing way day days`.split(/\s+/),
  // So common in scripture that they mark nothing.
  ...`lord god king man men people son sons children house land israel yahweh`.split(/\s+/),
]);
