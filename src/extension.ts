import {
  CancellationToken,
  CodeLens,
  CodeLensProvider,
  commands,
  DecorationOptions,
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  env,
  Event,
  EventEmitter,
  ExtensionContext,
  languages,
  MarkdownString,
  OverviewRulerLane,
  Range,
  TextDocument,
  window,
  workspace,
} from "vscode";
import ip from "ip";
import cidrRegex from "cidr-regex";
import { CIDRCodeAction } from "./code-action";
import {
  codeLensFormat,
  isCodeLensEnabled,
  isDecoratorEnabled,
  isStrictEnabled,
} from "./config";
const cidrPattern = new RegExp(cidrRegex.v4(), "g");
const COPY_COMMAND = "cidr-ip-range.copy";
export const INVALID_RANGE_COMMAND = "cidr-ip-range.invalid-range";
const rangeDecoration = window.createTextEditorDecorationType({
  after: {
    color: "#333",
    margin: "10px 0 10px 0",
    contentText: "",
  },
});
const diagnostics: DiagnosticCollection =
  languages.createDiagnosticCollection("cidr-ip-range");
const header = `
| | |
|-|-|
`;

const debounceMilliseconds = 500;
let debounceTimeout: NodeJS.Timeout;

const clearDebounce = () => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
};

const debounceCallback = (): void => {
  clearDebounce();
  debounceTimeout = setTimeout(onUpdate, debounceMilliseconds);
};

interface TableItem {
  key: string;
  value: string;
}

const renderTable = (items: TableItem[]) => {
  return (
    header +
    items.map(({ key, value }) => `| ${key} | \`${value}\` |`).join("\n")
  );
};

const onUpdate = (): CodeLens[] => {
  if (!window.activeTextEditor) {
    return [];
  }

  const doc = window.activeTextEditor.document;
  const text = doc.getText();
  const decorations: DecorationOptions[] = [];
  const codelenses: CodeLens[] = [];
  const diagnosticEntries: Diagnostic[] = [];

  let match;
  while ((match = cidrPattern.exec(text))) {
    const cidr = match[0];
    const [ipAddress, subnet] = cidr.split("/");
    const startPos = doc.positionAt(match.index);
    const endPos = doc.positionAt(match.index + cidr.length);
    const {
      networkAddress,
      firstAddress,
      lastAddress,
      broadcastAddress,
      subnetMask,
      numHosts,
      length,
    } = ip.cidrSubnet(cidr);

    const hover: MarkdownString = new MarkdownString();

    const tableData: TableItem[] = [
      { key: "Network address", value: networkAddress },
      { key: "Addresses in range", value: String(length) },
      { key: "Hosts in range", value: String(numHosts) },
      { key: "First host in range", value: firstAddress },
      { key: "Last host in range", value: lastAddress },
      { key: "Broadcast address", value: broadcastAddress },
      { key: "Subnet mask", value: subnetMask },
    ];

    const table = renderTable(tableData);
    hover.appendMarkdown(table);

    const s = length === 1 ? "" : "es";
    const range = new Range(startPos, endPos);

    const renderOptions: DecorationOptions["renderOptions"] = {
      after: {
        color: "#666",
        contentText: ` [${length} address${s}]`,
      },
    };

    decorations.push({
      range,
      hoverMessage: hover,
      renderOptions: isDecoratorEnabled() ? renderOptions : undefined,
    });

    if (isStrictEnabled() && ipAddress !== networkAddress) {
      const diagnostic = new Diagnostic(
        range,
        `CIDR notation must use the first address in the range i.e. ${networkAddress}/${subnet}`,
        DiagnosticSeverity.Warning
      );
      diagnostic.code = INVALID_RANGE_COMMAND;
      diagnosticEntries.push(diagnostic);
    }

    if (isCodeLensEnabled() && codeLensFormat() === "table") {
      codelenses.push({
        range,
        isResolved: false,
        command: {
          command: COPY_COMMAND,
          title: "Copy info to clipboard",
          arguments: [
            `Network address ${networkAddress}
Addresses in range ${String(length)}
Hosts in range ${String(numHosts)}
First host in range ${firstAddress}
Last host in range ${lastAddress}
Broadcast address ${broadcastAddress}
Subnet mask ${subnetMask}`,
          ],
        },
      });
    }

    if (isCodeLensEnabled() && codeLensFormat() === "json") {
      codelenses.push({
        range,
        isResolved: false,
        command: {
          command: COPY_COMMAND,
          title: "Copy info to clipboard as JSON",
          arguments: [
            JSON.stringify(
              {
                address: networkAddress,
                addressesInRange: length,
                hostsInRange: numHosts,
                firstHost: firstAddress,
                lastHost: lastAddress,
                broadcastAddress: broadcastAddress,
                subnetMask: subnetMask,
              },
              null,
              2
            ),
          ],
        },
      });
    }
  }

  diagnostics.set(doc.uri, diagnosticEntries);
  window.activeTextEditor.setDecorations(rangeDecoration, decorations);
  clearDebounce();
  return codelenses;
};

export function activate(context: ExtensionContext) {
  const onDocumentChangeSubscription =
    workspace.onDidChangeTextDocument(debounceCallback);
  const codeLensProvider = new CidrCodelensProvider();
  const codeLensSubscription = languages.registerCodeLensProvider(
    "*",
    codeLensProvider
  );
  const codeActionsProvider = languages.registerCodeActionsProvider(
    "*",
    new CIDRCodeAction()
  );
  const copyAction = commands.registerCommand(COPY_COMMAND, (payload) => {
    env.clipboard.writeText(payload);
  });
  context.subscriptions.push(
    onDocumentChangeSubscription,
    copyAction,
    codeActionsProvider,
    codeLensSubscription
  );
  debounceCallback();
}

export class CidrCodelensProvider implements CodeLensProvider {
  private regex: RegExp;
  private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
  public readonly onDidChangeCodeLenses: Event<void> =
    this._onDidChangeCodeLenses.event;

  constructor() {
    this.regex = /(.+)/g;

    workspace.onDidChangeConfiguration((_) => {
      this._onDidChangeCodeLenses.fire();
    });
  }

  public provideCodeLenses(
    _document: TextDocument,
    _cancellationToken: CancellationToken
  ): CodeLens[] | Thenable<CodeLens[]> {
    return onUpdate();
  }
}
