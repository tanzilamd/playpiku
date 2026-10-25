// Explicit editor settings keep behavior tests independent of the user's live listing.
export const fixtureGames = [
  {
    id: "bubble",
    show: true,
    isNew: true,
    name: "Piku Bubble Pop",
    description: "Bounce and match a little color.",
    category: "Arcade",
  },
  {
    id: "meteor",
    show: true,
    isNew: true,
    name: "Piku Meteor",
    description: "Find your orbit among the stars.",
    category: "Arcade",
  },
  {
    id: "snake",
    show: true,
    isNew: false,
    name: "Snake",
    description: "One more little bite.",
    category: "Arcade",
  },
  {
    id: "tictactoe",
    show: true,
    isNew: false,
    name: "Tic Tac Toe",
    description: "A friendly little rivalry.",
    category: "Puzzle",
  },
  {
    id: "reaction",
    show: true,
    isNew: false,
    name: "Reaction Test",
    description: "Wait for green.",
    category: "Quick play",
  },
];
export function fixtureConfig(base) {
  return {
    ...structuredClone(base),
    featuredGame: "bubble",
    games: structuredClone(fixtureGames),
    announcement: { show: false, text: "", linkText: "", url: "" },
    socialLinks: [],
    sections: { hero: true, recent: true, breakNote: true, relatedGames: true },
    library: { favorites: true, filters: true },
  };
}
