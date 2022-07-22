import { workspace } from "vscode";
type CodeLensFormat = "json" | "table";
const packageName = "cidr-ip-range";

const isCodeLensEnabled = (): boolean => {
  return workspace.getConfiguration(packageName).get("enableCodeLens", false);
};

const isDecoratorEnabled = (): boolean => {
  return workspace.getConfiguration(packageName).get("enableDecorator", true);
};

const codeLensFormat = (): CodeLensFormat => {
  return workspace.getConfiguration(packageName).get("codeLensFormat", "json");
};
const isStrictEnabled = (): boolean => {
  return workspace.getConfiguration(packageName).get("enableStrict", false);
};

export {
  isCodeLensEnabled,
  isDecoratorEnabled,
  codeLensFormat,
  isStrictEnabled,
  packageName,
  type CodeLensFormat,
};
