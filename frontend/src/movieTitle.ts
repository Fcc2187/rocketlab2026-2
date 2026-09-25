export function movieTitle(title: string) {
  let visible = title.trim()
  while (visible.length > 1 && visible.startsWith('"') && visible.endsWith('"')) {
    visible = visible.slice(1, -1).replace(/""/g, '"').trim()
  }
  return visible || title
}
