import { Centre } from '../types';

export const formatAddressLines = (centre: Centre): string => {
  const addressFields = [centre.name, centre.testCentreAddressLine1, centre.testCentreAddressLine2, centre.testCentreAddressCity, centre.testCentreAddressPostCode];
  return addressFields
    .filter(Boolean) // Skip if empty/null
    .join('\n');
};

// Regex to match gov notify markdown syntax #,*,^,--- in user input and escape with backslash
export const escapeNotifyMarkdown = (input: string): string => input.replace(/#|\*|\^|---/g, '\\\\$&');
