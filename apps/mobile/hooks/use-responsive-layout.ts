import { Platform, useWindowDimensions } from 'react-native';

const TABLET_MIN_WIDTH = 768;

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const shortSide = Math.min(width, height);
  const isTablet =
    Platform.OS === 'ios' ? Platform.isPad : shortSide >= TABLET_MIN_WIDTH;
  const isLandscape = width > height;
  const contentMaxWidth = isTablet ? (isLandscape ? 1180 : 920) : width;
  const horizontalPadding = isTablet ? 32 : 16;
  const scheduleColumns = isTablet ? (isLandscape ? 3 : 2) : 1;
  const sectionGap = isTablet ? 20 : 12;
  const photoPreviewHeight = isTablet ? (isLandscape ? 360 : 300) : 220;

  return {
    isTablet,
    isLandscape,
    width,
    contentMaxWidth,
    horizontalPadding,
    scheduleColumns,
    sectionGap,
    photoPreviewHeight,
  };
}
