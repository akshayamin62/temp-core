/**
 * Utility functions for handling user names
 */

interface NameFields {
  firstName?: string;
  middleName?: string;
  lastName?: string;
}

/**
 * Get the full name from a user object.
 * Computes from firstName/middleName/lastName.
 */
export function getFullName(user: NameFields | null | undefined): string {
  if (!user) return '';
  
  const parts: string[] = [];
  
  if (user.firstName?.trim()) {
    parts.push(user.firstName.trim());
  }
  
  if (user.middleName?.trim()) {
    parts.push(user.middleName.trim());
  }
  
  if (user.lastName?.trim()) {
    parts.push(user.lastName.trim());
  }
  
  return parts.length > 0 ? parts.join(' ') : '';
}

/**
 * Get initials from a user object for avatar display
 */
export function getInitials(user: NameFields | null | undefined): string {
  const fullName = getFullName(user);
  
  if (!fullName) return '?';
  
  const parts = fullName.split(' ').filter(part => part.length > 0);
  
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  
  // Return first letter of first name and first letter of last name
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
