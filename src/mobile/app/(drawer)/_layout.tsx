import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { Svg, Path, Rect, Line, Circle, Ellipse, Polyline } from 'react-native-svg';

// Custom sharp premium SVGs for navigation
const DashboardIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="3" width="7" height="9" rx="1" />
    <Rect x="14" y="3" width="7" height="5" rx="1" />
    <Rect x="14" y="12" width="7" height="9" rx="1" />
    <Rect x="3" y="16" width="7" height="5" rx="1" />
  </Svg>
);

const ControlsIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </Svg>
);

const AnalyticsIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Line x1="18" y1="20" x2="18" y2="10" />
    <Line x1="12" y1="20" x2="12" y2="4" />
    <Line x1="6" y1="20" x2="6" y2="14" />
  </Svg>
);

const SettingsIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="3" />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);

const BrainIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
    <Path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
  </Svg>
);

const ActivityIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </Svg>
);

const ClipboardIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </Svg>
);

const DatabaseIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Ellipse cx="12" cy="5" rx="9" ry="3" />
    <Path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <Path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </Svg>
);

const SproutIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M7 20h10" />
    <Path d="M10 20c5.5-5.5.5-16 .5-16" />
    <Path d="M10.5 4.5c-.5 5.5-5.5 10.5-5.5 10.5h1" />
    <Path d="M14 20c-5.5-5.5-.5-16-.5-16" />
    <Path d="M13.5 4.5c.5 5.5 5.5 10.5 5.5 10.5h-1" />
  </Svg>
);




export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#000000', borderBottomWidth: 1, borderBottomColor: '#27272a' },
        headerTintColor: '#fff',
        drawerStyle: {
          backgroundColor: '#09090b', // Sleek dark charcoal background
          width: 280,
        },
        drawerActiveTintColor: '#10b981', // Emerald green 500
        drawerInactiveTintColor: '#64748b', // Slate 500
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
        },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: 'Dashboard',
          title: 'Dashboard',
          drawerIcon: ({ color }) => <DashboardIcon color={color} />,
        }}
      />
      <Drawer.Screen
        name="controls"
        options={{
          drawerLabel: 'Controls',
          title: 'Controls',
          drawerIcon: ({ color }) => <ControlsIcon color={color} />,
        }}
      />
      <Drawer.Screen
        name="analytics"
        options={{
          drawerLabel: 'Analytics',
          title: 'Analytics',
          drawerIcon: ({ color }) => <AnalyticsIcon color={color} />,
        }}
      />
      <Drawer.Screen
        name="ml-insights"
        options={{
          drawerLabel: 'ML Insights',
          title: 'ML Insights',
          drawerIcon: ({ color }) => <BrainIcon color={color} />,
        }}
      />
      <Drawer.Screen
        name="system-health"
        options={{
          drawerLabel: 'System Health',
          title: 'System Health',
          drawerIcon: ({ color }) => <ActivityIcon color={color} />,
        }}
      />
      <Drawer.Screen
        name="ml-audit"
        options={{
          drawerLabel: 'ML Audit',
          title: 'ML Audit',
          drawerIcon: ({ color }) => <ClipboardIcon color={color} />,
        }}
      />
      <Drawer.Screen
        name="model-registry"
        options={{
          drawerLabel: 'Model Registry',
          title: 'Model Registry',
          drawerIcon: ({ color }) => <DatabaseIcon color={color} />,
        }}
      />
      <Drawer.Screen
        name="irrigation-efficiency"
        options={{
          drawerLabel: 'Efficiency',
          title: 'Irrigation Efficiency',
          drawerIcon: ({ color }) => <SproutIcon color={color} />,
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: 'Crop Settings',
          title: 'Crop Settings',
          drawerIcon: ({ color }) => <SettingsIcon color={color} />,
        }}
      />
    </Drawer>
  );
}
