import { expect } from "chai";
import { TextEditor, VSBrowser, Workbench } from "vscode-extension-tester";

import { DEFAULT_TIMEOUT } from "../constants";
import { AutocompleteSelectors } from "../selectors/Autocomplete.selectors";
import { TestUtils } from "../TestUtils";

export class AutocompleteActions {
  private static async typeTestMessage(editor: TextEditor, message: string) {
    // On CI, keystrokes can be lost to focus issues, which prevents the
    // completion request from firing at all. Retry until the text is verified
    // in the editor before waiting for ghost text.
    await TestUtils.waitForSuccess(async () => {
      await editor.clearText();
      await editor.typeTextAt(1, 1, message);
      await editor.typeTextAt(1, message.length + 1, " ");
      const text = await editor.getText();
      expect(text).to.include(message);
    }, DEFAULT_TIMEOUT.SM);
  }

  public static async testCompletions(editor: TextEditor) {
    const driver = editor.getDriver();

    const messagePair0 = TestUtils.generateTestMessagePair(0);
    await AutocompleteActions.typeTestMessage(editor, messagePair0.userMessage);
    const ghostText0 = await TestUtils.waitForSuccess(
      () => AutocompleteSelectors.getGhostTextContent(driver),
      // The first completion takes longer because Continue needs to load,
      // and CI runners are slower than local dev environments
      DEFAULT_TIMEOUT.XXL,
    );
    expect(ghostText0).to.equal(messagePair0.llmResponse);

    const messagePair1 = TestUtils.generateTestMessagePair(1);
    await AutocompleteActions.typeTestMessage(editor, messagePair1.userMessage);
    const ghostText1 = await TestUtils.waitForSuccess(
      () => AutocompleteSelectors.getGhostTextContent(driver),
      // CI runners are slower than local environments, so do not rely on
      // the default MD timeout here
      DEFAULT_TIMEOUT.XL,
    );
    expect(ghostText1).to.equal(messagePair1.llmResponse);
  }

  public static async forceCompletion(editor: TextEditor): Promise<string> {
    await editor.setText("def main():\n    ");
    await editor.moveCursor(2, 5);

    await new Workbench().executeCommand("continue.forceAutocomplete");

    const ghostText = await TestUtils.waitForSuccess(
      () =>
        AutocompleteSelectors.getGhostTextContent(VSBrowser.instance.driver),
      DEFAULT_TIMEOUT.XL,
    );

    return ghostText;
  }
}
