import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Suspense, useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  createExpoWorkbenchApplication,
  WorkbenchRuntimeProvider,
} from "../runtime/runtime-context";
import {
  createExpoPresentationRuntime,
  ExpoPresentationRuntimeProvider,
} from "../runtime/presentation-runtime";

// The application graph exists before the React root. React presents external
// stores; it does not create or own Host/Thread/Replica lifetimes.
const application = createExpoWorkbenchApplication();
const presentationRuntime = createExpoPresentationRuntime();

export default function RootLayout() {
  useEffect(() => () => {
    void application.dispose();
    void presentationRuntime.then((runtime) => runtime.dispose());
  }, []);
  return (
    <SafeAreaProvider>
      <Suspense fallback={null}>
        <ExpoPresentationRuntimeProvider runtime={presentationRuntime}>
          <WorkbenchRuntimeProvider application={application}>
            <StatusBar style="dark" />
            <Slot />
          </WorkbenchRuntimeProvider>
        </ExpoPresentationRuntimeProvider>
      </Suspense>
    </SafeAreaProvider>
  );
}
