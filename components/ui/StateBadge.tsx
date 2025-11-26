export function getStateColor(state: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    reviewed: 'bg-blue-100 text-blue-800',
    approve: 'bg-green-100 text-green-800',
    paid: 'bg-purple-100 text-purple-800',
    reject: 'bg-red-100 text-red-800',
  };
  
  return colors[state] || 'bg-gray-100 text-gray-800';
}