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
  switch (name.toLowerCase()) {
    case 'padi':
      return '🌾';
    case 'jagung':
      return '🌽';
    case 'kedelai':
      return '🌱';
    case 'cabai':
    case 'cabe':
      return '🌶️';
    case 'bawang merah':
    case 'bawang':
      return '🧅';
    default:
      return '🍀';
  }
};

export const getCropColor = (name) => {
  if (!name) return '#707a6c';
  const matched = standardCrops.find(c => c.id.toLowerCase() === name.toLowerCase());
  return matched ? matched.color : '#707a6c';
};
