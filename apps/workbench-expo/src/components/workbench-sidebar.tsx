import type { WorkbenchThread } from "@opencraft/workbench-runtime";
import { BlurView } from "expo-blur";
import {
  ChevronRight,
  CircleHelp,
  Folder,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  SquarePen,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

interface WorkbenchSidebarProps {
  threads: readonly WorkbenchThread[];
  activeThreadId: string;
  topInset: number;
  onSelectThread(id: string): void;
  onNewTask(): void;
  onClose(): void;
}

function SidebarAction({ icon, label, trailing, onPress }: {
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  onPress?(): void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <View style={styles.actionIcon}>{icon}</View>
      <Text style={styles.actionLabel}>{label}</Text>
      {trailing}
    </Pressable>
  );
}

function ThreadActivity({ status }: { status: WorkbenchThread["status"] }) {
  return (
    <View
      accessibilityLabel={status === "running" ? "Running" : status === "review" ? "Ready for review" : undefined}
      style={[
        styles.activity,
        status === "running" && styles.activityRunning,
        status === "review" && styles.activityReview,
      ]}
    />
  );
}

export function WorkbenchSidebar({
  threads,
  activeThreadId,
  topInset,
  onSelectThread,
  onNewTask,
  onClose,
}: WorkbenchSidebarProps) {
  const { theme } = useUnistyles();
  const secondary = theme.color.icon.secondary;
  const tertiary = theme.color.icon.tertiary;
  const metrics = theme.metrics;

  return (
    <BlurView intensity={72} tint="systemMaterialLight" style={[styles.sidebar, { paddingTop: topInset }]}> 
      <View style={styles.titleBar}>
        <Text style={styles.largeTitle}>OpenCraft</Text>
        <View style={styles.titleActions}>
          <Pressable accessibilityLabel="New task" accessibilityRole="button" onPress={onNewTask} style={({ pressed }) => [styles.touchButton, pressed && styles.pressed]}>
            <SquarePen color={theme.color.accent.blue} size={metrics.control.icon} strokeWidth={1.9} />
          </Pressable>
          <Pressable accessibilityLabel="Hide sidebar" accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.touchButton, pressed && styles.pressed]}>
            <PanelLeftClose color={secondary} size={metrics.control.icon} strokeWidth={1.9} />
          </Pressable>
        </View>
      </View>

      <Pressable accessibilityRole="search" style={({ pressed }) => [styles.searchField, pressed && styles.pressed]}>
        <Search color={tertiary} size={metrics.control.icon} strokeWidth={1.8} />
        <Text style={styles.searchPlaceholder}>Search</Text>
      </Pressable>

      <View style={styles.primaryGroup}>
        <SidebarAction
          icon={<SquarePen color={theme.color.accent.blue} size={metrics.control.icon} strokeWidth={1.9} />}
          label="New task"
          onPress={onNewTask}
        />
        <View style={styles.groupSeparator} />
        <SidebarAction
          icon={<Folder color={theme.color.accent.blue} size={metrics.control.icon} strokeWidth={1.9} />}
          label="Projects"
          trailing={<ChevronRight color={tertiary} size={metrics.control.iconSmall} strokeWidth={2} />}
        />
      </View>

      <View style={styles.taskSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RECENT TASKS</Text>
          <Pressable accessibilityLabel="New task" onPress={onNewTask} style={({ pressed }) => [styles.sectionAdd, pressed && styles.pressed]}>
            <Plus color={secondary} size={metrics.control.iconSmall} strokeWidth={2} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.threadList} showsVerticalScrollIndicator={false}>
          {threads.map((thread) => {
            const active = thread.id === activeThreadId;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={thread.id}
                onPress={() => onSelectThread(thread.id)}
                style={({ pressed }) => [styles.thread, active && styles.threadActive, pressed && styles.pressed]}
              >
                <ThreadActivity status={thread.status} />
                <View style={styles.threadCopy}>
                  <Text numberOfLines={1} style={styles.threadTitle}>{thread.title}</Text>
                  <Text numberOfLines={1} style={styles.threadMeta}>{thread.project} · {thread.time}</Text>
                </View>
                {thread.unread ? <View style={styles.unread} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.footerGroup}>
        <SidebarAction icon={<CircleHelp color={secondary} size={metrics.control.icon} strokeWidth={1.8} />} label="Help" />
        <View style={styles.groupSeparator} />
        <SidebarAction icon={<Settings color={secondary} size={metrics.control.icon} strokeWidth={1.8} />} label="Settings" />
        <View style={styles.groupSeparator} />
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.account, pressed && styles.pressed]}>
          <View style={styles.avatar}><Text style={styles.avatarText}>V</Text></View>
          <View style={styles.accountCopy}>
            <Text numberOfLines={1} style={styles.accountName}>OpenCraft</Text>
            <Text style={styles.accountMeta}>Local workspace</Text>
          </View>
          <ChevronRight color={tertiary} size={metrics.control.iconSmall} strokeWidth={2} />
        </Pressable>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create((theme) => ({
  sidebar: {
    width: theme.metrics.sidebar.width,
    flex: 1,
    paddingHorizontal: theme.metrics.sidebar.horizontalInset,
    backgroundColor: theme.material.sidebar,
  },
  titleBar: {
    height: theme.metrics.sidebar.largeTitleHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: theme.spacing[1],
  },
  largeTitle: { color: theme.color.text.primary, ...theme.platformTypography.largeTitle },
  titleActions: { flexDirection: "row", alignItems: "center", gap: theme.spacing[1] },
  touchButton: {
    width: theme.metrics.toolbar.touchTarget,
    height: theme.metrics.toolbar.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.metrics.control.radius,
  },
  searchField: {
    height: theme.metrics.sidebar.searchHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radii.lg,
    backgroundColor: theme.material.grouped,
  },
  searchPlaceholder: { color: theme.color.text.tertiary, ...theme.platformTypography.body },
  primaryGroup: {
    marginTop: theme.spacing[5],
    overflow: "hidden",
    borderRadius: theme.radii.xl,
    backgroundColor: theme.material.raised,
  },
  action: {
    height: theme.metrics.sidebar.actionHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
  },
  actionIcon: { width: theme.metrics.toolbar.touchTarget - theme.spacing[5], alignItems: "center" },
  actionLabel: { flex: 1, color: theme.color.text.primary, ...theme.platformTypography.sidebarAction },
  groupSeparator: { height: 1, marginLeft: theme.metrics.sidebar.groupSeparatorInset, backgroundColor: theme.material.separator },
  taskSection: { flex: 1, minHeight: 0, paddingTop: theme.spacing[5] },
  sectionHeader: {
    height: theme.metrics.sidebar.sectionHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[2],
  },
  sectionTitle: { color: theme.color.text.tertiary, ...theme.platformTypography.section },
  sectionAdd: {
    width: theme.metrics.toolbar.touchTarget,
    height: theme.metrics.toolbar.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.metrics.control.radius,
  },
  threadList: { gap: theme.spacing[1], paddingBottom: theme.spacing[4] },
  thread: {
    minHeight: theme.metrics.sidebar.threadHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.metrics.sidebar.selectionRadius,
  },
  threadActive: { backgroundColor: theme.material.selected },
  activity: {
    width: theme.metrics.control.activityDot,
    height: theme.metrics.control.activityDot,
    borderRadius: theme.radii.full,
    backgroundColor: "transparent",
  },
  activityRunning: { backgroundColor: theme.color.accent.positive },
  activityReview: { backgroundColor: theme.color.accent.blue },
  threadCopy: { flex: 1, minWidth: 0 },
  threadTitle: { color: theme.color.text.primary, ...theme.platformTypography.sidebarThread },
  threadMeta: { marginTop: 1, color: theme.color.text.tertiary, ...theme.platformTypography.sidebarMeta },
  unread: {
    width: theme.metrics.control.activityDot,
    height: theme.metrics.control.activityDot,
    borderRadius: theme.radii.full,
    backgroundColor: theme.color.accent.blue,
  },
  footerGroup: {
    overflow: "hidden",
    marginBottom: theme.spacing[3],
    borderRadius: theme.radii.xl,
    backgroundColor: theme.material.raised,
  },
  account: {
    height: theme.metrics.sidebar.accountHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
  },
  avatar: {
    width: theme.metrics.sidebar.avatar,
    height: theme.metrics.sidebar.avatar,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.lg,
    backgroundColor: theme.material.grouped,
  },
  avatarText: { color: theme.color.text.secondary, ...theme.platformTypography.label },
  accountCopy: { flex: 1, minWidth: 0 },
  accountName: { color: theme.color.text.primary, ...theme.platformTypography.sidebarThread },
  accountMeta: { color: theme.color.text.tertiary, ...theme.platformTypography.sidebarMeta },
  pressed: { opacity: theme.metrics.interaction.pressedOpacity },
}));
