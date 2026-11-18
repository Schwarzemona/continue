import { expect } from "chai";
import {
  TextEditor,
  VSBrowser,
  WebDriver,
  Workbench,
} from "vscode-extension-tester";

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

  private static async getGhostTextWithRetriggers(
    editor: TextEditor,
    driver: WebDriver,
    message: string,
    totalTimeout: number,
  ): Promise<string> {
    // The first completion request can be dropped while the core is still
    // starting up, and typed triggers are flaky on CI. Re-type to re-trigger,
    // and after the first attempt, also fire the forceAutocomplete command,
    // which is proven reliable on CI.
    let lastError: Error = new Error("Ghost text never appeared");
    const deadline = Date.now() + totalTimeout;
    let attempt = 0;
    while (Date.now() < deadline) {
      await AutocompleteActions.typeTestMessage(editor, message);
      if (attempt > 0) {
        await new Workbench().executeCommand("continue.forceAutocomplete");
      }
      attempt++;
      try {
        return await TestUtils.waitForSuccess(
          () => AutocompleteSelectors.getGhostTextContent(driver),
          DEFAULT_TIMEOUT.MD,
        );
      } catch (e) {
        lastError = e as Error;
      }
    }
    throw lastError;
  }

  public static async testCompletions(editor: TextEditor) {
    const messagePair0 = TestUtils.generateTestMessagePair(0);
    const ghostText0 = await AutocompleteActions.getGhostTextWithRetriggers(
      editor,
      editor.getDriver(),
      messagePair0.userMessage,
      DEFAULT_TIMEOUT.XXL,
    );
    expect(ghostText0).to.equal(messagePair0.llmResponse);

    const messagePair1 = TestUtils.generateTestMessagePair(1);
    const ghostText1 = await AutocompleteActions.getGhostTextWithRetriggers(
      editor,
      editor.getDriver(),
      messagePair1.userMessage,
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
