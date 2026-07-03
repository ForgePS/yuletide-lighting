import { View, StyleSheet, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

type ScreenContainerProps = ViewProps & {
  backgroundColor?: string;
};

export function ScreenContainer({
  children,
  style,
  backgroundColor = '#F8FAFC',
  ...props
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, horizontalPadding } = useResponsiveLayout();

  return (
    <View
      style={[
        styles.safe,
        {
          backgroundColor,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          { maxWidth: contentMaxWidth, paddingHorizontal: horizontalPadding },
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  inner: { flex: 1, width: '100%', alignSelf: 'center' },
});
