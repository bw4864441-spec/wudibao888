export function filterIcons(icons, category, query) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return icons.filter((icon) => {
    const categoryMatches = category === "All" || icon.category === category;
    const searchable = `${icon.name} ${icon.nameZh} ${icon.category}`.toLocaleLowerCase();
    return categoryMatches && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
}

const columns = [9, 25, 43, 63, 83, 95, 17, 34, 52, 71, 89, 7, 24, 42, 61, 79, 94, 14, 32, 50, 68, 86, 6, 22, 39, 57, 75, 92, 13, 30, 48, 66, 84, 7, 95, 18, 36, 55, 74, 90, 11, 46, 82, 27, 64, 20, 50, 81, 36, 63, 90, 24, 47, 76, 11, 88];
const rows = [14, 17, 12, 16, 13, 18, 39, 43, 38, 42, 40, 67, 70, 64, 69, 65, 72, 87, 84, 90, 85, 88, 29, 56, 93, 57, 92, 55, 74, 25, 77, 28, 76, 49, 31, 31, 31, 30, 32, 30, 79, 53, 52, 50, 51, 62, 61, 62, 80, 80, 81, 48, 48, 48, 58, 58];
const sizes = [150, 138, 148, 142, 148, 84, 118, 152, 124, 166, 116, 92, 140, 118, 158, 126, 92, 96, 136, 112, 154, 108, 76, 82, 74, 80, 72, 78, 88, 76, 84, 72, 82, 70, 76, 78, 72, 80, 74, 76, 70, 72, 74, 92, 88, 84, 90, 86, 82, 86, 80, 88, 84, 90, 76, 78];
const rotations = [-5, 4, -3, 5, -4, 3, -4, 4, -5, 2, 5, -3, 2, -6, 4, -3, 6, -4, 3, -5, 4, -2, 6, -4, 3, -5, 4, -3, 5, -4, 2, -3, 4, -5, 3, -4, 3, -2, 4, -3, 5, -4, 2, -3, 4, -2, 3, -4, 2, 3, -4, 2, -3, 4, -2, 3];

export function scatterStyle(index) {
  if (index >= columns.length) {
    const overflowIndex = index - columns.length;
    return {
      x: 8 + ((overflowIndex * 19) % 84),
      y: 10 + ((overflowIndex * 29) % 80),
      size: 72 + ((overflowIndex * 7) % 28),
      rotation: (overflowIndex % 9) - 4,
    };
  }

  return {
    x: columns[index],
    y: rows[index],
    size: sizes[index],
    rotation: rotations[index],
  };
}
