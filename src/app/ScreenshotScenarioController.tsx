import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HAUNTED_SCREENSHOT_SCENARIOS, type HauntedScreenshotScenario } from './HauntedScreenshotScenarios';

type Props = {
  enabled: boolean;
  onSelect: (scenario: HauntedScreenshotScenario) => void;
};

export function ScreenshotScenarioController({ enabled, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  if (!enabled) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable
        testID="screenshot-scenario-menu"
        accessibilityRole="button"
        accessibilityLabel="Screenshot scenario menu"
        onPress={() => setOpen(true)}
        style={styles.hotspot}
      />

      {open && (
        <View testID="screenshot-scenario-picker" style={styles.backdrop}>
          <View style={styles.panel}>
            <Text style={styles.title}>SCREENSHOT SCENARIO</Text>
            <View style={styles.grid}>
              {HAUNTED_SCREENSHOT_SCENARIOS.map((scenario) => (
                <Pressable
                  key={scenario}
                  testID={`screenshot-scenario-${scenario}`}
                  accessibilityRole="button"
                  onPress={() => {
                    setOpen(false);
                    onSelect(scenario);
                  }}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                >
                  <Text style={styles.optionText}>{scenario.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable testID="screenshot-scenario-cancel" onPress={() => setOpen(false)} style={styles.cancel}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hotspot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 40,
    height: 40,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1001,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 9, 20, 0.92)',
    padding: 18,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#60e5ff',
    borderRadius: 10,
    backgroundColor: '#16172e',
    padding: 12,
    gap: 10,
  },
  title: {
    color: '#f8da76',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  option: {
    minWidth: 94,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6772b8',
    borderRadius: 6,
    backgroundColor: '#252a50',
    paddingHorizontal: 7,
  },
  optionText: {
    color: '#f4f0dc',
    fontFamily: 'monospace',
    fontSize: 7,
    fontWeight: '900',
    textAlign: 'center',
  },
  cancel: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  cancelText: {
    color: '#aeb5d8',
    fontFamily: 'monospace',
    fontSize: 8,
    fontWeight: '800',
  },
  pressed: { opacity: 0.65 },
});
