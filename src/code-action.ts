import {
  CodeActionProvider,
  CodeActionKind,
  TextDocument,
  Range,
  WorkspaceEdit,
  CodeAction,
} from "vscode";
import cidrRegex from "cidr-regex";
import ip from "ip";
const cidrPattern = new RegExp(cidrRegex.v4(), "g");

export class CIDRCodeAction implements CodeActionProvider {
  public static readonly providedCodeActionKinds = [CodeActionKind.QuickFix];

  public provideCodeActions(
    document: TextDocument,
    range: Range
  ): CodeAction[] | undefined {
    const text = document.getText(range);
    const matches = text.match(cidrPattern);
    if (!matches) {
      return;
    }
    const cidr = matches[0];
    const { networkAddress } = ip.cidrSubnet(cidr);
    const correctRange = `${networkAddress}/${cidr.split("/")[1]}`;
    const replaceRangeFix = this.createFix(document, range, correctRange);
    return [replaceRangeFix];
  }

  private createFix(
    document: TextDocument,
    range: Range,
    correctRange: string
  ): CodeAction {
    const fix = new CodeAction(
      `Convert to ${correctRange}`,
      CodeActionKind.QuickFix
    );
    fix.edit = new WorkspaceEdit();
    fix.edit.replace(document.uri, range, correctRange);
    return fix;
  }
}
