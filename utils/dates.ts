export const Dates = {
  toISOExtended: (date: Date) => {
    return date.toISOString().slice(0, 19) + "+00:00";
  },

  toISOSimple: (date: Date) => {
    return date.toISOString().slice(0, 19) + "Z";
  },

  daysAgo: (days: number) => {
    const date = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000);
    return date;
  },

  secondsAgo: (seconds: number) => {
    const date = new Date(new Date().getTime() - seconds * 1000);
    return date;
  },
};
