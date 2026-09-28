export const ADMIN_PATH = '/admin';

export const TYPING_BASE = '/english/typing';

export const typingPath = (path = '') => `${TYPING_BASE}${path}`;

export const SITE_PATHS = {
  home: '/',
  login: '/login',
  signup: '/signup',
  english: '/english',
  native: '/native-language',
  biology: '/biology',
  chemistry: '/chemistry',
  fullMock: '/full-mock',
} as const;
