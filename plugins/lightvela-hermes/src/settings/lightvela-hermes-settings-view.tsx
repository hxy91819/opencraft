import { Bot, LogIn, LogOut, RefreshCw, ServerCog } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import {
  SettingsButton,
  SettingsGroup,
  SettingsListItem,
  SettingsNotice,
  SettingsPageHeader,
  SettingsSection,
  type ExtensionSettingsViewProps,
} from "@opencraft/extension-react";

import type { LightVelaAccountService } from "../account/lightvela-account-service";

export const LIGHTVELA_HERMES_HOST_ID = "velahermes0";

export function createLightVelaHermesSettingsView(account: LightVelaAccountService) {
  return function LightVelaHermesSettingsView({ host }: ExtensionSettingsViewProps) {
    const accountSnapshot = useSyncExternalStore(account.subscribe, account.getSnapshot, account.getSnapshot);
    const [pendingBotId, setPendingBotId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const installed = host.profiles.find((profile) => profile.hostId === LIGHTVELA_HERMES_HOST_ID) ?? null;

    useEffect(() => {
      account.bootstrapOAuthFragment();
      void account.refreshBots().catch(() => undefined);
    }, []);

    const attach = async (botId: string) => {
      if (pendingBotId !== null || accountSnapshot.activeBotId === botId) return;
      setPendingBotId(botId);
      setActionError(null);
      try {
        account.selectBot(botId);
        if (installed === null) {
          await host.provisionHost({
            hostId: LIGHTVELA_HERMES_HOST_ID,
            displayName: "My Hermes",
            providerId: "lightvela.hermes",
            providerConfig: {},
            hostKind: "remote-control",
            autoConnect: false,
            includeInSidebar: true,
            credentialRef: "lightvela.browser-session",
            transportEndpoint: "LightVela",
            executionLocation: "LightVela",
            workspaceBrowseRoots: [],
          });
        }
      } catch (error) {
        setActionError(error instanceof Error ? error.message : String(error));
      } finally {
        setPendingBotId(null);
      }
    };

    return (
      <>
        <SettingsPageHeader title="LightVela" description="Use a running LightVela Bot as the Hermes execution Host." />

        <SettingsSection
          title="Account"
          icon={<ServerCog size={15} />}
          description="Authentication belongs to this extension and is never written into AppServer frames."
        >
          <SettingsGroup>
            <SettingsListItem
              icon={<Bot size={16} />}
              label={accountSnapshot.phase === "authenticated" ? "LightVela connected" : "LightVela account"}
              description={(
                <>
                  {accountSnapshot.phase === "loading"
                    ? "Checking account…"
                    : accountSnapshot.phase === "authenticated"
                      ? `${accountSnapshot.bots.length} running Bot${accountSnapshot.bots.length === 1 ? "" : "s"}`
                      : "Sign in with the international LightVela account"}
                </>
              )}
              actions={accountSnapshot.phase === "authenticated" ? (
                <SettingsButton variant="ghost" type="button" title="Sign out" aria-label="Sign out" onClick={() => account.signOut()}>
                  <LogOut size={15} />
                </SettingsButton>
              ) : (
                <SettingsButton type="button" onClick={() => account.signIn()}>
                  <LogIn size={15} /> Sign in
                </SettingsButton>
              )}
            />
          </SettingsGroup>
          {accountSnapshot.error !== null ? <SettingsNotice tone="error">{accountSnapshot.error}</SettingsNotice> : null}
        </SettingsSection>

        {accountSnapshot.phase === "authenticated" ? (
          <SettingsSection
            title="Running Bots"
            description={<>Selecting a Bot provisions the single persistent Host <code>{LIGHTVELA_HERMES_HOST_ID}</code>.</>}
            action={(
              <SettingsButton
                type="button"
                onClick={() => void account.refreshBots().catch(() => undefined)}
              >
                <RefreshCw size={14} /> Refresh
              </SettingsButton>
            )}
          >
            <SettingsGroup>
              {accountSnapshot.bots.map((bot) => {
                const selected = accountSnapshot.activeBotId === bot.instanceId;
                return (
                  <SettingsListItem
                    key={bot.instanceId}
                    icon={<Bot size={16} />}
                    label={bot.name}
                    description={bot.instanceId}
                    metadata={selected ? "velahermes0 · Installed" : "Hermes over Tencent TAT"}
                    actions={<SettingsButton
                      type="button"
                      disabled={pendingBotId !== null || selected}
                      onClick={() => void attach(bot.instanceId)}
                    >
                      {pendingBotId === bot.instanceId ? "Adding…" : selected ? "Installed" : "Use Host"}
                    </SettingsButton>}
                  />
                );
              })}
            </SettingsGroup>
            {actionError !== null ? <SettingsNotice tone="error">{actionError}</SettingsNotice> : null}
          </SettingsSection>
        ) : null}
      </>
    );
  };
}
