export const standardCrops = [
  { id: 'Padi', label: 'Padi', emoji: '🌾', color: '#2e7d32' },
  { id: 'Jagung', label: 'Jagung', emoji: '🌽', color: '#f57f17' },
  { id: 'Kedelai', label: 'Kedelai', emoji: '🌱', color: '#ffb300' },
  { id: 'Cabai', label: 'Cabai', emoji: '🌶️', color: '#d32f2f' },
  { id: 'Bawang Merah', label: 'Bawang Merah', emoji: '🧅', color: '#8e24aa' },
  { id: 'Lainnya', label: 'Lainnya', emoji: '🍀', color: '#707a6c' },
];

export const getCropEmoji = (name) => {
  if (!name) return '🍀';
  const cleanName = name.toLowerCase();
  if (cleanName.includes('padi')) return '🌾';
  if (cleanName.includes('jagung')) return '🌽';
  if (cleanName.includes('kedelai')) return '🌱';
  if (cleanName.includes('cabai') || cleanName.includes('cabe')) return '🌶️';
  if (cleanName.includes('bawang')) return '🧅';
  if (cleanName.includes('tomat')) return '🍅';
  if (cleanName.includes('kentang')) return '🥔';
  if (cleanName.includes('semangka')) return '🍉';
  if (cleanName.includes('melon')) return '🍈';
  if (cleanName.includes('wortel')) return '🥕';
  if (cleanName.includes('kacang')) return '🥜';
  if (cleanName.includes('jahe')) return '🌱';
  return '🍀';
};

export const getCropColor = (name) => {
  if (!name) return '#707a6c';
  const cleanName = name.toLowerCase();
  if (cleanName.includes('padi')) return '#2e7d32';
  if (cleanName.includes('jagung')) return '#f57f17';
  if (cleanName.includes('kedelai')) return '#ffb300';
  if (cleanName.includes('cabai') || cleanName.includes('cabe')) return '#d32f2f';
  if (cleanName.includes('bawang')) return '#8e24aa';
  if (cleanName.includes('tomat')) return '#e53935';
  if (cleanName.includes('kentang')) return '#8d6e63';
  if (cleanName.includes('semangka')) return '#2e7d32';
  if (cleanName.includes('melon')) return '#4caf50';
  if (cleanName.includes('wortel')) return '#f57c00';
  if (cleanName.includes('kacang')) return '#a1887f';
  if (cleanName.includes('jahe')) return '#8d6e63';
  
  const matched = standardCrops.find(c => c.id.toLowerCase() === cleanName);
  return matched ? matched.color : '#707a6c';
};
