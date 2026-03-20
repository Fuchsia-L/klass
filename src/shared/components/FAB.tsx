import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  GestureResponderEvent,
  PanResponder,
  PanResponderGestureState,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import {
  FAB_DRAG_ACTIVE_OPACITY,
  FAB_IDLE_OPACITY,
  clampFabPosition,
  getDefaultFabPosition,
  hasExceededDragThreshold,
  snapFabPosition,
} from './fabPosition';

interface FABProps {
  onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
  const theme = useTheme();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const screenSize = useMemo(() => ({ width: screenWidth, height: screenHeight }), [screenHeight, screenWidth]);
  const [position, setPosition] = useState(() => getDefaultFabPosition(screenSize));
  const [isDragging, setIsDragging] = useState(false);
  const animatedPosition = useRef(new Animated.ValueXY(position)).current;
  const animatedOpacity = useRef(new Animated.Value(FAB_IDLE_OPACITY)).current;
  const positionRef = useRef(position);
  const dragStartRef = useRef(position);
  const didDragRef = useRef(false);

  const setAnimatedFabPosition = (nextPosition: { x: number; y: number }) => {
    positionRef.current = nextPosition;
    animatedPosition.setValue(nextPosition);
  };

  const handleDragMove = (_event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    const nextPosition = clampFabPosition(
      {
        x: dragStartRef.current.x + gestureState.dx,
        y: dragStartRef.current.y + gestureState.dy,
      },
      screenSize,
    );

    setAnimatedFabPosition(nextPosition);
  };

  const stopDragging = (nextPosition: { x: number; y: number }) => {
    positionRef.current = nextPosition;
    setPosition(nextPosition);
    setIsDragging(false);

    Animated.parallel([
      Animated.spring(animatedPosition, {
        toValue: nextPosition,
        useNativeDriver: false,
        bounciness: 0,
      }),
      Animated.timing(animatedOpacity, {
        toValue: FAB_IDLE_OPACITY,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gestureState) => hasExceededDragThreshold(gestureState.dx, gestureState.dy),
        onPanResponderGrant: () => {
          dragStartRef.current = positionRef.current;
          didDragRef.current = true;
          setIsDragging(true);

          Animated.timing(animatedOpacity, {
            toValue: FAB_DRAG_ACTIVE_OPACITY,
            duration: 120,
            useNativeDriver: false,
          }).start();
        },
        onPanResponderMove: handleDragMove,
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_event, gestureState) => {
          const releasedPosition = clampFabPosition(
            {
              x: dragStartRef.current.x + gestureState.dx,
              y: dragStartRef.current.y + gestureState.dy,
            },
            screenSize,
          );

          stopDragging(snapFabPosition(releasedPosition, screenSize));
        },
        onPanResponderTerminate: (_event, gestureState) => {
          const releasedPosition = clampFabPosition(
            {
              x: dragStartRef.current.x + gestureState.dx,
              y: dragStartRef.current.y + gestureState.dy,
            },
            screenSize,
          );

          stopDragging(snapFabPosition(releasedPosition, screenSize));
        },
      }),
    [animatedOpacity, animatedPosition, screenSize],
  );

  return (
    <Animated.View
      testID="fab-container"
      {...panResponder.panHandlers}
      style={[
        styles.fab,
        {
          ...animatedPosition.getLayout(),
          opacity: animatedOpacity,
          backgroundColor: theme.colors.accent,
          shadowColor: theme.colors.card || '#111827',
        },
      ]}
    >
      <TouchableOpacity
        testID="fab-button"
        activeOpacity={0.8}
        onPressIn={() => {
          didDragRef.current = false;
        }}
        onPress={() => {
          if (!isDragging && !didDragRef.current) {
            onPress();
          }
        }}
        style={styles.button}
      >
        <Plus size={28} color={theme.colors.textMain} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  button: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
