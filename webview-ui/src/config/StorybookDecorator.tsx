import "../../../node_modules/@vscode/codicons/dist/codicon.css";
import "../../../node_modules/@vscode/codicons/dist/codicon.ttf";
import "../../src/index.css";


import {
  ExtensionStateContext,
  ExtensionStateContextProvider,
  type ExtensionStateContextType,
  useExtensionState,
} from "@/context/ExtensionStateContext";
import { cn } from "@heroui/react";
import type { Decorator } from "@storybook/react-vite";
import React from "react";

const StorybookThemes = {
  light: {
    "--vscode-editor-background": "#ffffff",
    "--vscode-editor-foreground": "#000000",
    "--vscode-font-family": "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
    "--vscode-font-size": "13px",
    "--vscode-progressBar-background": "#007acc",
    "--vscode-scrollbarSlider-background": "rgba(100, 100, 100, 0.4)",
  },
  dark: {
    "--vscode-editor-background": "#1e1e1e",
    "--vscode-editor-foreground": "#d4d4d4",
    "--vscode-font-family": "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
    "--vscode-font-size": "11px",
    "--vscode-progressBar-background": "#007acc",
    "--vscode-scrollbarSlider-background": "rgba(121, 121, 121, 0.4)",
  },
};


// Component that handles theme switching
const ThemeHandler: React.FC<{ children: React.ReactNode; theme?: string }> = ({
  children,
  theme,
}) => {
  React.useEffect(() => {
    const styles = theme?.includes("light") ? StorybookThemes.light : StorybookThemes.dark;

    // Apply CSS variables to the document root
    const root = document.documentElement;
    for (const [property, value] of Object.entries(styles)) {
      root.style.setProperty(property, value);
    }


    document.body.style.backgroundColor = styles["--vscode-editor-background"];
    document.body.style.color = styles["--vscode-editor-foreground"];
    document.body.style.fontFamily = styles["--vscode-font-family"];
    document.body.style.fontSize = styles["--vscode-font-size"];

    return () => {
      // Cleanup on unmount
      for (const property of Object.keys(styles)) {
        root.style.removeProperty(property);
      }

    };
  }, [theme]);

  return <>{children}</>;
};
function StorybookDecoratorProvider(className = "relative"): Decorator {
  return (story, parameters) => {
    return (
      <div className={className}>
        <ExtensionStateContextProvider>
          <ThemeHandler theme={parameters?.globals?.theme}>
            {React.createElement(story)}
          </ThemeHandler>
        </ExtensionStateContextProvider>
      </div>
    );
  };
}

// Wrapper component to safely use useExtensionState inside the provider
const ExtensionStateProviderWithOverrides: React.FC<{
  overrides?: Partial<ExtensionStateContextType>;
  children: React.ReactNode;
}> = ({ overrides, children }) => {
  const extensionState = useExtensionState();
  return (
    <ExtensionStateContext.Provider value={{ ...extensionState, ...overrides }}>
      {children}
    </ExtensionStateContext.Provider>
  );
};



export const createStorybookDecorator = (overrideStates?: Partial<ExtensionStateContextType>, classNames?: string) => (Story: React.ComponentType) => (
  <ExtensionStateProviderWithOverrides overrides={overrideStates}>
    <div className={cn("max-w-lg mx-auto", classNames)}>
      <Story />
    </div>
  </ExtensionStateProviderWithOverrides>
);


export const StorybookWebview = StorybookDecoratorProvider();
