import type { WorkbenchThread } from "@opencraft/workbench-runtime";
import {
  Check,
  Cloud,
  Code2,
  MoreHorizontal,
  PanelLeftOpen,
  Share,
  SidebarOpen,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

interface WorkbenchHeaderProps {
  thread: WorkbenchThread | undefined;
  roomy: boolean;
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  topInset: number;
  onToggleSidebar(): void;
  onToggleRightPanel(): void;
}

function ToolbarButton({ label, children, active, onPress }: {
  label: string;
  children: ReactNode;
  active?: boolean;
  onPress?(): void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.toolbarButton, active && styles.toolbarButtonActive, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

export function WorkbenchHeader({
  thread,
  roomy,
  sidebarOpen,
  rightPanelOpen,
  topInset,
  onToggleSidebar,
  onToggleRightPanel,
}: WorkbenchHeaderProps) {
  const { theme } = useUnistyles();
  const secondary = theme.color.icon.secondary;
  const metrics = theme.metrics;

  return (
    <View style={[styles.header, { height: metrics.toolbar.height + topInset, paddingTop: topInset }]}> 
      {!sidebarOpen ? (
        <ToolbarButton label="Show sidebar" onPress={onToggleSidebar}>
          <PanelLeftOpen color={theme.color.accent.blue} size={metrics.control.icon} strokeWidth={1.9} />
        </ToolbarButton>
      ) : null}

      <View style={styles.context}>
        <View style={styles.projectIcon}>
          <Code2 color={secondary} size={metrics.control.icon} strokeWidth={1.9} />
        </View>
        <View style={styles.titleCopy}>
          <Text numberOfLines={1} style={styles.title}>{thread?.title ?? "Untitled task"}</Text>
          <Text numberOfLines={1} style={styles.meta}>{thread?.project ?? "OpenCraft"} · main</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {roomy ? (
          <View style={styles.hostStatus}>
            <View style={styles.hostDot} />
            <Cloud color={secondary} size={metrics.control.iconSmall} strokeWidth={1.8} />
            <Text style={styles.hostText}>Local</Text>
          </View>
        ) : null}
        {roomy ? (
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.editorButton, pressed && styles.pressed]}>
            <Code2 color={theme.color.accent.blue} size={metrics.control.iconSmall} strokeWidth={1.9} />
            <Text style={styles.editorButtonText}>Open in editor</Text>
          </Pressable>
        ) : null}
        <ToolbarButton label="Share"><Share color={theme.color.accent.blue} size={metrics.control.icon} strokeWidth={1.9} /></ToolbarButton>
        <ToolbarButton label="Task details" active={rightPanelOpen} onPress={onToggleRightPanel}>
          {rightPanelOpen
            ? <Check color={theme.color.accent.blue} size={metrics.control.icon} strokeWidth={2} />
            : <SidebarOpen color={secondary} size={metrics.control.icon} strokeWidth={1.9} />}
        </ToolbarButton>
        <ToolbarButton label="More"><MoreHorizontal color={secondary} size={metrics.control.icon} strokeWidth={1.9} /></ToolbarButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[3],
    backgroundColor: theme.material.content,
    borderBottomWidth: 1,
    borderBottomColor: theme.material.separator,
  },
  context: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  projectIcon: {
    width: theme.metrics.toolbar.projectIcon,
    height: theme.metrics.toolbar.projectIcon,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.metrics.control.radius,
    backgroundColor: theme.material.grouped,
  },
  titleCopy: { minWidth: 0, flexShrink: 1 },
  title: { color: theme.color.text.primary, ...theme.platformTypography.navigationTitle },
  meta: { color: theme.color.text.tertiary, ...theme.platformTypography.navigationMeta },
  actions: { flexDirection: "row", alignItems: "center", gap: theme.spacing[1] },
  toolbarButton: {
    width: theme.metrics.toolbar.touchTarget,
    height: theme.metrics.toolbar.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.metrics.control.radius,
  },
  toolbarButtonActive: { backgroundColor: theme.material.grouped },
  hostStatus: {
    height: theme.metrics.toolbar.statusHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radii.full,
    backgroundColor: theme.material.grouped,
  },
  hostDot: {
    width: theme.metrics.control.statusDot,
    height: theme.metrics.control.statusDot,
    borderRadius: theme.radii.full,
    backgroundColor: theme.color.accent.positive,
  },
  hostText: { color: theme.color.text.secondary, ...theme.platformTypography.label },
  editorButton: {
    height: theme.metrics.toolbar.touchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.metrics.control.radius,
    backgroundColor: theme.material.grouped,
  },
  editorButtonText: { color: theme.color.text.primary, ...theme.platformTypography.label },
  pressed: { opacity: theme.metrics.interaction.pressedOpacity },
}));
