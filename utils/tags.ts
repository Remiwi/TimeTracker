export const Tags = {
  toList: (tags: string) => {
    const trimmed = tags.trim();
    if (trimmed === "") {
      return [];
    }
    return tags.split(",");
  },

  toString: (tags: string[]) => {
    const trimmed = tags.map((tag) => tag.trim());
    return trimmed.join(",");
  },
};
