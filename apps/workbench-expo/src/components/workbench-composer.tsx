import { BlurView } from "expo-blur";
import { ArrowUp, ChevronDown, Mic, Paperclip, Square } from "lucide-react-native";
import {
  composerDocumentToPlainText,
  resolveComposerPrimaryAction,
  type ComposerController,
  type ComposerFollowUpAction,
  type SubmitIntent,
} from "@opencraft/composer-core";
import { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { Pressable, Text, TextInput, type TextInput as TextInputHandle, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

interface WorkbenchComposerProps {
  controller: ComposerController;
  isStreaming: boolean;
  bottomInset: number;
  onSubmit(
    intent: SubmitIntent,
    context: { readonly followUpAction: ComposerFollowUpAction | null },
  ): boolean | void | Promise<boolean | void>;
  onCancel(): void;
}

export function WorkbenchComposer({
  controller,
  isStreaming,
  bottomInset,
  onSubmit,
  onCancel,
}: WorkbenchComposerProps) {
  const { theme } = useUnistyles();
  const inputRef = useRef<TextInputHandle>(null);
  const submitPendingRef = useRef(false);
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const draft = composerDocumentToPlainText(snapshot.draft.document);
  const canSend = snapshot.canSubmit;
  const secondary = theme.color.icon.secondary;
  const metrics = theme.metrics;

  const updateText = useCallback((text: string) => {
    controller.dispatch({
      type: "set-document",
      document: {
        version: 1,
        blocks: [{ type: "paragraph", children: text.length === 0 ? [] : [{ type: "text", text }] }],
      },
    });
  }, [controller]);

  const send = useCallback(async (followUpAction?: ComposerFollowUpAction) => {
    if (!snapshot.canSubmit || submitPendingRef.current) return;
    let intent: SubmitIntent;
    try {
      intent = controller.createSubmitIntent();
    } catch {
      return;
    }
    submitPendingRef.current = true;
    controller.dispatch({ type: "set-lifecycle", phase: "submitting" });
    try {
      const accepted = await onSubmit(intent, {
        followUpAction: isStreaming ? followUpAction ?? "queue" : null,
      });
      if (accepted !== false) controller.dispatch({ type: "clear" });
      else controller.dispatch({ type: "set-lifecycle", phase: "editing" });
    } catch (error) {
      controller.dispatch({
        type: "set-lifecycle",
        phase: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      submitPendingRef.current = false;
    }
  }, [controller, isStreaming, onSubmit, snapshot.canSubmit]);

  useLayoutEffect(() => controller.registerView({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    insertText: (text) => {
      updateText(`${composerDocumentToPlainText(controller.getSnapshot().draft.document)}${text}`);
      inputRef.current?.focus();
    },
    beginTransientTextInput: () => null,
    undo: () => undefined,
    redo: () => undefined,
  }), [controller, updateText]);

  const primaryAction = resolveComposerPrimaryAction({
    isResponseInProgress: isStreaming,
    canSubmit: snapshot.canSubmit,
    defaultFollowUpAction: "queue",
  });
  const primaryActionLabel = primaryAction === "stop"
    ? "Stop response"
    : primaryAction === "queue"
      ? "Queue follow-up"
      : primaryAction === "steer"
        ? "Steer active response"
        : "Send message";

  return (
    <View style={[styles.region, { paddingBottom: Math.max(bottomInset, metrics.composer.outerBottomInset) }]}> 
      {isStreaming ? (
        <View style={styles.workingStatus}>
          <View style={styles.workingDots}>
            <View style={styles.workingDot} />
            <View style={styles.workingDot} />
            <View style={styles.workingDot} />
          </View>
          <Text style={styles.workingText}>Working</Text>
        </View>
      ) : null}

      <View style={styles.shadowShell}>
        <BlurView intensity={82} tint="systemMaterialLight" style={styles.composer}>
          <TextInput
            accessibilityLabel="Message OpenCraft"
            multiline
            onChangeText={updateText}
            placeholder="Message OpenCraft"
            placeholderTextColor={theme.color.text.tertiary}
            ref={inputRef}
            style={styles.input}
            value={draft}
          />

          <View style={styles.actionRow}>
            <Pressable accessibilityLabel="Attach files" accessibilityRole="button" style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
              <Paperclip color={secondary} size={metrics.control.icon} strokeWidth={1.9} />
            </Pressable>
            <Pressable accessibilityLabel="Select model" accessibilityRole="button" style={({ pressed }) => [styles.modelButton, pressed && styles.pressed]}>
              <Text style={styles.modelLabel}>GPT-5.2</Text>
              <ChevronDown color={theme.color.icon.tertiary} size={metrics.control.iconSmall} strokeWidth={2} />
            </Pressable>
            <View style={styles.actionSpacer} />
            {!isStreaming && !canSend ? (
              <Pressable accessibilityLabel="Voice input" accessibilityRole="button" style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                <Mic color={secondary} size={metrics.control.icon} strokeWidth={1.9} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel={primaryActionLabel}
              accessibilityRole="button"
              accessibilityState={{ disabled: primaryAction !== "stop" && !canSend }}
              disabled={primaryAction !== "stop" && !canSend}
              onPress={primaryAction === "stop"
                ? onCancel
                : () => { void send(primaryAction === "send" ? undefined : primaryAction); }}
              style={({ pressed }) => [
                styles.sendButton,
                primaryAction !== "stop" && !canSend && styles.sendButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              {primaryAction === "stop"
                ? <Square color={theme.color.button.primaryForeground} fill={theme.color.button.primaryForeground} size={12} strokeWidth={0} />
                : <ArrowUp color={theme.color.button.primaryForeground} size={21} strokeWidth={2.2} />}
            </Pressable>
          </View>
        </BlurView>
      </View>
      <Text style={styles.disclaimer}>OpenCraft can make mistakes. Review generated code and commands.</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  region: {
    paddingHorizontal: theme.spacing[6],
    backgroundColor: "transparent",
  },
  workingStatus: {
    width: "100%",
    maxWidth: theme.metrics.composer.maximumWidth,
    minHeight: theme.metrics.toolbar.touchTarget,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
  },
  workingDots: { flexDirection: "row", alignItems: "center", gap: theme.spacing[1] },
  workingDot: {
    width: theme.metrics.composer.workingDot,
    height: theme.metrics.composer.workingDot,
    borderRadius: theme.radii.full,
    backgroundColor: theme.color.icon.tertiary,
  },
  workingText: { color: theme.color.text.tertiary, ...theme.platformTypography.label },
  shadowShell: {
    width: "100%",
    maxWidth: theme.metrics.composer.maximumWidth,
    alignSelf: "center",
    borderRadius: theme.metrics.composer.radius,
    backgroundColor: theme.material.raised,
    shadowColor: theme.shadow.composer.color,
    shadowOpacity: theme.shadow.composer.opacity,
    shadowRadius: theme.shadow.composer.radius,
    shadowOffset: { width: 0, height: theme.shadow.composer.offsetY },
    elevation: theme.shadow.composer.elevation,
  },
  composer: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.material.separator,
    borderRadius: theme.metrics.composer.radius,
    backgroundColor: theme.material.raised,
  },
  input: {
    minHeight: theme.metrics.composer.inputMinimumHeight + theme.metrics.composer.inputTopInset,
    maxHeight: theme.metrics.composer.inputMaximumHeight,
    paddingTop: theme.metrics.composer.inputTopInset,
    paddingHorizontal: theme.metrics.composer.inputHorizontalInset,
    paddingBottom: theme.spacing[1],
    color: theme.color.text.primary,
    textAlignVertical: "top",
    ...theme.platformTypography.composer,
  },
  actionRow: {
    height: theme.metrics.composer.actionRowHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[2],
    paddingBottom: theme.spacing[2],
  },
  actionButton: {
    width: theme.metrics.composer.actionButton,
    height: theme.metrics.composer.actionButton,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.metrics.control.radius,
  },
  modelButton: {
    height: theme.metrics.composer.actionButton,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radii.full,
    backgroundColor: theme.material.grouped,
  },
  modelLabel: { color: theme.color.text.secondary, ...theme.platformTypography.label },
  actionSpacer: { flex: 1 },
  sendButton: {
    width: theme.metrics.composer.sendButton,
    height: theme.metrics.composer.sendButton,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.full,
    backgroundColor: theme.color.button.primary,
  },
  sendButtonDisabled: { opacity: theme.metrics.interaction.disabledOpacity },
  disclaimer: {
    marginTop: theme.spacing[2],
    color: theme.color.text.tertiary,
    textAlign: "center",
    ...theme.platformTypography.caption,
  },
  pressed: { opacity: theme.metrics.interaction.pressedOpacity },
}));
