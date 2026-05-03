export const lightColors = {
  primary: '#2DD4BF',
  primaryDark: '#0D9488',
  primaryLight: '#5EEAD4',
  primaryMuted: 'rgba(45, 212, 191, 0.1)',

  secondary: '#FB7185',
  secondaryLight: '#FDA4AF',

  background: '#F1F5F9',
  backgroundSecondary: '#F3F4F6',
  backgroundCard: '#FFFFFF',

  text: '#1F2937',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textWhite: '#FFFFFF',
  textMuted: 'rgba(31, 41, 55, 0.6)',

  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderFocus: '#2DD4BF',

  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.08)',
  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.08)',

  facebook: '#1877F2',
  google: '#EA4335',
  apple: '#000000',

  shadow: 'rgba(0, 0, 0, 0.05)',
  shadowDark: 'rgba(0, 0, 0, 0.1)',

  placeholder: '#9CA3AF',
  disabled: '#D1D5DB',
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayDark: 'rgba(0, 0, 0, 0.5)',
  secondaryMuted: 'rgba(251, 113, 133, 0.1)',
  socialAppleBackground: '#F3F4F6',
  socialGoogleBackground: '#FEF2F2',
  socialFacebookBackground: '#EFF6FF',
};

export const darkColors = {
  primary: '#2DD4BF',
  primaryDark: '#5EEAD4',
  primaryLight: '#99F6E4',
  primaryMuted: 'rgba(45, 212, 191, 0.16)',

  secondary: '#FB7185',
  secondaryLight: '#FDA4AF',

  background: '#0F172A',
  backgroundSecondary: '#111827',
  backgroundCard: '#1E293B',

  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textLight: '#94A3B8',
  textWhite: '#FFFFFF',
  textMuted: 'rgba(248, 250, 252, 0.68)',

  border: '#334155',
  borderLight: '#243244',
  borderFocus: '#2DD4BF',

  error: '#F87171',
  errorLight: 'rgba(248, 113, 113, 0.14)',
  success: '#34D399',
  successLight: 'rgba(52, 211, 153, 0.14)',

  facebook: '#60A5FA',
  google: '#F87171',
  apple: '#F8FAFC',

  shadow: 'rgba(0, 0, 0, 0.28)',
  shadowDark: 'rgba(0, 0, 0, 0.45)',

  placeholder: '#64748B',
  disabled: '#475569',
  overlay: 'rgba(0, 0, 0, 0.55)',
  overlayDark: 'rgba(0, 0, 0, 0.72)',
  secondaryMuted: 'rgba(251, 113, 133, 0.18)',
  socialAppleBackground: '#111827',
  socialGoogleBackground: '#2A1720',
  socialFacebookBackground: '#112036',
};

export type AppColors = typeof lightColors;
export type ThemeMode = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

export const Colors = lightColors;

export default Colors;
