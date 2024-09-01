export const feedData = [
  {
    id: 1,
    content: `I work 9-5, have a family, manage to publish videos consistently, work on side projects, run 2-3 miles daily, but you can’t even finish watching one 30 minute coding tutorial.

You don’t need guidance.
you don’t need a mentor.
You need discipline.`,
    user: {
      name: `SomeRandomDevWeb`,
      avatar: `https://placecats.com/millie/300/200`,
    },
  },
  {
    id: 2,
    content: `If you are starting a new project, please don't use Jest.
Use Vitest instead.`,
    user: {
      name: `Floren Ryance`,
      avatar: `https://placecats.com/neo/300/200`,
    },
  },
  {
    id: 3,
    content: `Cursor is pure hype, Cursor is shiny object syndrome.

Microsoft will answer with a better integration of copilot and everyone will be back to vscode...`,
    user: {
      name: `PrimeRageN`,
      avatar: `https://placecats.com/millie_neo/300/200`,
    },
  },
  {
    id: 4,
    content: `Honestly when trying to find outlier founders, a large part of it is finding the autist nerds who will go infinitely deep on a particular topic that happens to be extremely valuable for making something people want`,
    user: {
      name: `bramadov 22`,
      avatar: `https://placecats.com/neo_banana/300/200`,
    },
  },
]

export type FeedItem = (typeof feedData)[0]
